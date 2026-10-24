import type { AdminClient } from "@repo/database/admin";
import { z } from "zod";

/**
 * A marketing segment's criteria (`marketing_segments.criteria`), the same
 * shape the back office writes (apps/admin/lib/segments.ts). A recipient
 * must match every criterion that is set.
 */
export const segmentCriteria = z
  .object({
    crm_status: z
      .array(z.enum(["lead", "customer", "vip", "churned"]))
      .min(1)
      .optional(),
    locale: z.enum(["ar", "en"]).optional(),
    plus_member: z.boolean().optional(),
    tags: z.array(z.string().min(1).max(40)).min(1).max(20).optional(),
  })
  .strict();

export type SegmentCriteria = z.infer<typeof segmentCriteria>;

/** Stored criteria; malformed criteria match nobody rather than everybody. */
export const parseCriteria = (value: unknown): SegmentCriteria | null => {
  const parsed = segmentCriteria.safeParse(value ?? {});
  return parsed.success ? parsed.data : null;
};

export interface Audience {
  /** CRM rows of the candidates. */
  contacts: { status: string; tags: string[]; user_id: string }[];
  /** Who has an email address on their account (auth.users). */
  emails: Map<string, string>;
  /** Users with a live membership of The IDEA Plus. */
  plusMembers: Set<string>;
  /** Opted-in, unsuspended profiles. */
  profiles: { id: string; locale: string }[];
}

export interface Recipient {
  email: string;
  locale: "ar" | "en";
  userId: string;
}

/**
 * Picks the recipients of a segment from the loaded audience: opted-in
 * profiles with an email that match every criterion. Pure, so it is tested
 * without a database.
 */
export const selectRecipients = (
  audience: Audience,
  criteria: SegmentCriteria
): Recipient[] => {
  const crm = new Map(
    audience.contacts.map((contact) => [contact.user_id, contact])
  );
  const wantedTags = criteria.tags?.map((tag) => tag.toLowerCase());

  return audience.profiles.flatMap((profile) => {
    const email = audience.emails.get(profile.id);
    if (!email) {
      return [];
    }
    const locale = profile.locale === "en" ? "en" : "ar";
    if (criteria.locale && criteria.locale !== locale) {
      return [];
    }
    const contact = crm.get(profile.id);
    if (
      criteria.crm_status &&
      !(contact && (criteria.crm_status as string[]).includes(contact.status))
    ) {
      return [];
    }
    if (
      wantedTags &&
      !contact?.tags.some((tag) => wantedTags.includes(tag.toLowerCase()))
    ) {
      return [];
    }
    if (
      criteria.plus_member !== undefined &&
      audience.plusMembers.has(profile.id) !== criteria.plus_member
    ) {
      return [];
    }
    return [{ email, locale, userId: profile.id }];
  });
};

const PAGE = 1000;
const IN_CHUNK = 200;

const chunks = <T>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size)
  );

/** Every opted-in, unsuspended profile (paged). */
const loadProfiles = async (admin: AdminClient) => {
  const profiles: { id: string; locale: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const query = admin
      .from("profiles")
      .select("id, locale")
      .eq("marketing_opt_in", true)
      .is("banned_at", null)
      .order("id")
      .range(from, from + PAGE - 1);
    // biome-ignore lint/performance/noAwaitInLoops: pages are sequential
    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }
    profiles.push(...(data ?? []));
    if ((data ?? []).length < PAGE) {
      return profiles;
    }
  }
};

/** Email addresses of all users, from the Auth admin API (paged). */
const loadEmails = async (admin: AdminClient) => {
  const emails = new Map<string, string>();
  for (let page = 1; ; page += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: pages are sequential
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PAGE,
    });
    if (error) {
      throw new Error(error.message);
    }
    for (const user of data.users) {
      if (user.email) {
        emails.set(user.id, user.email);
      }
    }
    if (data.users.length < PAGE) {
      return emails;
    }
  }
};

const loadContacts = async (admin: AdminClient, ids: string[]) => {
  const results = await Promise.all(
    chunks(ids, IN_CHUNK).map((chunk) =>
      admin
        .from("crm_contacts")
        .select("user_id, status, tags")
        .in("user_id", chunk)
    )
  );
  return results.flatMap((result) => {
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.data ?? [];
  });
};

const loadPlusMembers = async (admin: AdminClient, ids: string[]) => {
  const now = new Date().toISOString();
  const results = await Promise.all(
    chunks(ids, IN_CHUNK).map((chunk) =>
      admin
        .from("subscriptions")
        .select("user_id, current_period_end, plans!inner(audience)")
        .eq("plans.audience", "plus")
        .in("status", ["active", "past_due"])
        .in("user_id", chunk)
    )
  );
  const members = new Set<string>();
  for (const result of results) {
    if (result.error) {
      throw new Error(result.error.message);
    }
    for (const row of result.data ?? []) {
      if (
        row.user_id &&
        (row.current_period_end === null || row.current_period_end > now)
      ) {
        members.add(row.user_id);
      }
    }
  }
  return members;
};

/**
 * Resolves a segment to its recipients with the admin client (emails live
 * in auth.users, which RLS can't expose). Trusted server code only.
 */
export const resolveRecipients = async (
  admin: AdminClient,
  criteria: SegmentCriteria
): Promise<Recipient[]> => {
  // Locales are matched in selectRecipients (Kurdish readers get Arabic).
  const profiles = await loadProfiles(admin);
  if (profiles.length === 0) {
    return [];
  }
  const ids = profiles.map((profile) => profile.id);
  const [emails, contacts, plusMembers] = await Promise.all([
    loadEmails(admin),
    criteria.crm_status || criteria.tags
      ? loadContacts(admin, ids)
      : Promise.resolve([]),
    criteria.plus_member === undefined
      ? Promise.resolve(new Set<string>())
      : loadPlusMembers(admin, ids),
  ]);
  return selectRecipients(
    { contacts, emails, plusMembers, profiles },
    criteria
  );
};
