import type { AdminClient } from "@repo/database/admin";
import type { resend } from "@repo/email";

/**
 * Newsletter contacts: The IDEA sends newsletters from Resend Broadcasts to
 * one Resend segment (`RESEND_SEGMENT_ID`). This sync keeps that segment in
 * step with the accounts:
 *
 * - push: every account with an email becomes a contact (first and last
 *   name from the profile), `unsubscribed` unless it opted in to marketing
 *   email (`profiles.marketing_opt_in`) and isn't suspended;
 * - pull: a contact who unsubscribed in Resend (a broadcast's unsubscribe
 *   link) turns the account's opt-in off;
 * - contacts that no longer belong to an account (deleted accounts) are
 *   removed from Resend.
 *
 * When the account is opted in but Resend says unsubscribed, the newer
 * change wins: the account's opt-in if it changed after the contact was last
 * pushed (they opted in again in their settings), otherwise Resend's
 * unsubscribe. The database keeps both times (`public.newsletter_audience()`).
 */

/** A row of `public.newsletter_audience()`. */
export interface AudienceRow {
  email: string;
  full_name: string | null;
  marketing_opt_in: boolean;
  opt_in_changed_at: string | null;
  suspended: boolean;
  synced_at: string | null;
  user_id: string;
}

/** A contact as Resend lists it. */
export interface Contact {
  email: string;
  first_name: string | null;
  id: string;
  last_name: string | null;
  unsubscribed: boolean;
}

export interface ContactUpdate {
  /** Set when the contact already exists in the segment. */
  contactId?: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  unsubscribed: boolean;
  userId: string;
}

export interface SyncPlan {
  /** Accounts that unsubscribed in Resend: opt-in goes off. */
  optOut: string[];
  /** Contacts to create or update. */
  push: ContactUpdate[];
  /** Contacts in the segment without an account. */
  remove: Contact[];
}

const WHITESPACE = /\s+/;

/** "Ali Hassan Kareem" → Ali / Hassan Kareem; blank → no name. */
export const splitName = (fullName: string | null) => {
  const words = (fullName ?? "").trim().split(WHITESPACE).filter(Boolean);
  return {
    firstName: words[0] ?? null,
    lastName: words.length > 1 ? words.slice(1).join(" ") : null,
  };
};

const time = (value: string | null) =>
  value === null ? Number.NaN : Date.parse(value);

/** Whether the account's opt-in changed after it was last pushed. */
export const accountIsNewer = (row: AudienceRow) =>
  time(row.opt_in_changed_at) > time(row.synced_at);

/** What to change on each side. Pure, so it is tested without services. */
export const planSync = (
  audience: AudienceRow[],
  contacts: Contact[]
): SyncPlan => {
  const byEmail = new Map(
    contacts.map((contact) => [contact.email.toLowerCase(), contact])
  );
  const optOut: string[] = [];
  const push: ContactUpdate[] = [];

  for (const row of audience) {
    const email = row.email.toLowerCase();
    const contact = byEmail.get(email);
    byEmail.delete(email);

    let optedIn = row.marketing_opt_in;
    if (
      contact?.unsubscribed &&
      optedIn &&
      !row.suspended &&
      !accountIsNewer(row)
    ) {
      optOut.push(row.user_id);
      optedIn = false;
    }

    const unsubscribed = !optedIn || row.suspended;
    const { firstName, lastName } = splitName(row.full_name);
    if (
      !contact ||
      contact.unsubscribed !== unsubscribed ||
      (contact.first_name || null) !== firstName ||
      (contact.last_name || null) !== lastName
    ) {
      push.push({
        contactId: contact?.id,
        email,
        firstName,
        lastName,
        unsubscribed,
        userId: row.user_id,
      });
    }
  }

  return { optOut, push, remove: [...byEmail.values()] };
};

// ── Running it ───────────────────────────────────────────────────────────────

export type ContactsApi = NonNullable<typeof resend>["contacts"];

interface ResendResult {
  error: { message: string; name: string } | null;
}

export interface SyncOptions {
  admin: AdminClient;
  contacts: ContactsApi;
  /** Stop starting Resend requests after this time (ms since epoch). */
  deadline: number;
  /** Minimum gap between Resend requests (its default limit is 2/s). */
  gapMs?: number;
  segmentId: string;
  sleep?: (ms: number) => Promise<void>;
}

export interface SyncResult {
  accounts: number;
  contacts: number;
  failed: number;
  optedOut: number;
  /** True when the deadline cut the run short; the next run continues. */
  partial: boolean;
  pushed: number;
  removed: number;
}

const PAGE = 1000;
const CONTACTS_PAGE = 100;
const UPDATE_CHUNK = 200;
const MARK_EVERY = 50;
const RETRIES = 3;

class DeadlineReached extends Error {}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** Every account with an email (paged; PostgREST returns 1000 rows at most). */
const loadAudience = async (admin: AdminClient) => {
  const rows: AudienceRow[] = [];
  for (let from = 0; ; from += PAGE) {
    // biome-ignore lint/performance/noAwaitInLoops: pages are sequential
    const { data, error } = await admin
      .rpc("newsletter_audience")
      .range(from, from + PAGE - 1);
    if (error) {
      throw new Error(error.message);
    }
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE) {
      return rows;
    }
  }
};

type Call = <T extends ResendResult>(request: () => Promise<T>) => Promise<T>;

/** Resend requests: paced, retried when rate limited, stopped at the deadline. */
const pacer = (
  deadline: number,
  gapMs: number,
  sleep: (ms: number) => Promise<void>
): Call => {
  let last = 0;
  return async (request) => {
    for (let attempt = 0; ; attempt += 1) {
      if (Date.now() >= deadline) {
        throw new DeadlineReached();
      }
      const wait = last + gapMs - Date.now();
      if (wait > 0) {
        // biome-ignore lint/performance/noAwaitInLoops: requests are paced
        await sleep(wait);
      }
      last = Date.now();
      const result = await request();
      if (result.error?.name !== "rate_limit_exceeded" || attempt >= RETRIES) {
        return result;
      }
      await sleep(1000 * (attempt + 1));
    }
  };
};

/** Every contact in the segment (cursor-paged, 100 at a time). */
const listContacts = async (
  call: Call,
  api: ContactsApi,
  segmentId: string
) => {
  const listed: Contact[] = [];
  let after: string | undefined;
  for (;;) {
    const cursor = after;
    // biome-ignore lint/performance/noAwaitInLoops: pages are sequential
    const { data, error } = await call(() =>
      api.list(
        cursor
          ? { after: cursor, limit: CONTACTS_PAGE, segmentId }
          : { limit: CONTACTS_PAGE, segmentId }
      )
    );
    if (error || !data) {
      throw new Error(error?.message ?? "Resend returned no contacts");
    }
    listed.push(...data.data);
    after = data.data.at(-1)?.id;
    if (!(data.has_more && after)) {
      return listed;
    }
  }
};

const optOut = async (admin: AdminClient, userIds: string[]) => {
  for (let start = 0; start < userIds.length; start += UPDATE_CHUNK) {
    // biome-ignore lint/performance/noAwaitInLoops: small, sequential batches
    const { error } = await admin
      .from("profiles")
      .update({ marketing_opt_in: false })
      .in("id", userIds.slice(start, start + UPDATE_CHUNK));
    if (error) {
      throw new Error(error.message);
    }
  }
};

const markSynced = async (admin: AdminClient, userIds: string[]) => {
  if (userIds.length === 0) {
    return;
  }
  const { error } = await admin.rpc("mark_newsletter_synced", {
    user_ids: userIds,
  });
  if (error) {
    throw new Error(error.message);
  }
};

/** Creates or updates one contact; returns Resend's error, if any. */
const pushContact = async (
  call: Call,
  api: ContactsApi,
  segmentId: string,
  update: ContactUpdate
) => {
  const fields = {
    firstName: update.firstName,
    lastName: update.lastName,
    unsubscribed: update.unsubscribed,
  };
  if (update.contactId) {
    const id = update.contactId;
    return (await call(() => api.update({ id, ...fields }))).error;
  }
  const created = await call(() =>
    api.create({
      email: update.email,
      firstName: fields.firstName ?? undefined,
      lastName: fields.lastName ?? undefined,
      segments: [{ id: segmentId }],
      unsubscribed: fields.unsubscribed,
    })
  );
  if (!created.error) {
    return null;
  }
  // Already a contact elsewhere in Resend: update it and add it here.
  const updated = await call(() =>
    api.update({ email: update.email, ...fields })
  );
  if (updated.error) {
    return created.error;
  }
  return (
    await call(() => api.segments.add({ email: update.email, segmentId }))
  ).error;
};

/** Runs one sync. Throws when a list or database step fails. */
export const syncNewsletterContacts = async ({
  admin,
  contacts: api,
  deadline,
  gapMs = 550,
  segmentId,
  sleep = defaultSleep,
}: SyncOptions): Promise<SyncResult> => {
  const call = pacer(deadline, gapMs, sleep);
  const listed = await listContacts(call, api, segmentId);
  const audience = await loadAudience(admin);
  const plan = planSync(audience, listed);
  await optOut(admin, plan.optOut);

  const result: SyncResult = {
    accounts: audience.length,
    contacts: listed.length,
    failed: 0,
    optedOut: plan.optOut.length,
    partial: false,
    pushed: 0,
    removed: 0,
  };
  let synced: string[] = [];

  try {
    for (const update of plan.push) {
      // biome-ignore lint/performance/noAwaitInLoops: Resend is rate limited
      const error = await pushContact(call, api, segmentId, update);
      if (error) {
        result.failed += 1;
        continue;
      }
      result.pushed += 1;
      synced.push(update.userId);
      if (synced.length >= MARK_EVERY) {
        await markSynced(admin, synced);
        synced = [];
      }
    }

    // Never empty the segment because the account list came back empty.
    const remove = audience.length > 0 ? plan.remove : [];
    for (const contact of remove) {
      // biome-ignore lint/performance/noAwaitInLoops: Resend is rate limited
      const { error } = await call(() => api.remove({ id: contact.id }));
      result[error ? "failed" : "removed"] += 1;
    }
  } catch (error) {
    if (!(error instanceof DeadlineReached)) {
      throw error;
    }
    result.partial = true;
  } finally {
    await markSynced(admin, synced);
  }

  return result;
};
