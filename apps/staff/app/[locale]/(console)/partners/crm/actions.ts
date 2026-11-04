"use server";

import { z } from "zod";
import {
  ActionFailure,
  affected,
  check,
  staffAction,
} from "@/lib/admin/action";
import { failure, success } from "@/lib/admin/action-state";
import { uuid } from "@/lib/admin/forms";
import {
  contactKey,
  dealRow,
  dealSchema,
  type ExistingOrg,
  type ImportPlan,
  MAX_SHEET_CHARS,
  orgRow,
  orgSchema,
  type PersonSheetRow,
  parseOrgSheet,
  parsePeopleSheet,
  personOrg,
  personRow,
  personSchema,
  planImport,
  touchNextAction,
  touchSchema,
} from "@/lib/admin/partner-crm";
import type { ServerClient } from "@/lib/admin/session";

// The partner CRM. Editors and marketing (and admins) work it as
// themselves: RLS lets those roles in, with an AAL2 session. People's
// details are third parties' personal data: never logged or returned
// beyond these pages.

const SECTION = "partnerCrm";

export const savePartnerOrg = staffAction(
  SECTION,
  orgSchema,
  async ({ input, supabase }) => {
    const row = orgRow(input);
    if (input.id) {
      affected(
        await supabase
          .from("partner_orgs")
          .update(row)
          .eq("id", input.id)
          .select("id")
      );
      return success();
    }
    const { data } = check(
      await supabase.from("partner_orgs").insert(row).select("id").single()
    );
    return success("saved", { redirectTo: `/partners/crm/${data?.id}` });
  }
);

/** Admins only (as the database): the organization and everything in it. */
export const deletePartnerOrg = staffAction(
  SECTION,
  z.object({ id: uuid }),
  async ({ input, staff, supabase }) => {
    if (!(staff.role === "admin" || staff.role === "superadmin")) {
      return failure("forbidden");
    }
    affected(
      await supabase
        .from("partner_orgs")
        .delete()
        .eq("id", input.id)
        .select("id")
    );
    return success("deleted", { redirectTo: "/partners/crm" });
  }
);

export const savePartnerPerson = staffAction(
  SECTION,
  personSchema,
  async ({ input, supabase }) => {
    const row = personRow(input);
    if (input.id) {
      affected(
        await supabase
          .from("partner_people")
          .update(row)
          .eq("id", input.id)
          .eq("org_id", input.orgId)
          .select("id")
      );
      return success();
    }
    check(
      await supabase
        .from("partner_people")
        .insert({ ...row, org_id: input.orgId })
    );
    return success();
  }
);

export const deletePartnerPerson = staffAction(
  SECTION,
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("partner_people")
        .delete()
        .eq("id", input.id)
        .select("id")
    );
    return success("deleted");
  }
);

/** Logs a touch as oneself, and sets or clears the next action with it. */
export const logPartnerTouch = staffAction(
  SECTION,
  touchSchema,
  async ({ input, staff, supabase }) => {
    check(
      await supabase.from("partner_touches").insert({
        channel: input.channel,
        happened_at: input.happenedAt,
        inbound: input.direction === "inbound",
        org_id: input.orgId,
        person_id: input.personId,
        staff_id: staff.userId,
        summary: input.summary,
      })
    );
    const next = touchNextAction(input);
    if (next) {
      affected(
        await supabase
          .from("partner_orgs")
          .update(next)
          .eq("id", input.orgId)
          .select("id")
      );
    }
    return success();
  }
);

/** One's own touches (admins: anyone's), as the database allows. */
export const deletePartnerTouch = staffAction(
  SECTION,
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("partner_touches")
        .delete()
        .eq("id", input.id)
        .select("id")
    );
    return success("deleted");
  }
);

export const savePartnerDeal = staffAction(
  SECTION,
  dealSchema,
  async ({ input, supabase }) => {
    const row = dealRow(input);
    if (input.id) {
      affected(
        await supabase
          .from("partner_deals")
          .update(row)
          .eq("id", input.id)
          .eq("org_id", input.orgId)
          .select("id")
      );
      return success();
    }
    check(
      await supabase
        .from("partner_deals")
        .insert({ ...row, org_id: input.orgId })
    );
    return success();
  }
);

export const deletePartnerDeal = staffAction(
  SECTION,
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("partner_deals")
        .delete()
        .eq("id", input.id)
        .select("id")
    );
    return success("deleted");
  }
);

// ── The CSV import ──────────────────────────────────────────────────────

const PAGE = 1000;
const BATCH = 100;
const ORG_COLUMNS = "id, name, website, tags";

const loadOrgs = async (supabase: ServerClient) => {
  const orgs: ExistingOrg[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = check(
      // biome-ignore lint/performance/noAwaitInLoops: pages are sequential
      await supabase
        .from("partner_orgs")
        .select(ORG_COLUMNS)
        .order("created_at")
        .order("id")
        .range(from, from + PAGE - 1)
    );
    orgs.push(...(data ?? []));
    if ((data ?? []).length < PAGE) {
      return orgs;
    }
  }
};

const chunks = <T>(items: readonly T[], size: number) => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

/**
 * Inserts rows in batches; a batch the database refuses is retried row by
 * row, so one bad row doesn't stop the rest. Returns what went in and the
 * lines that didn't.
 */
const insertAll = async <Row extends { line: number }, Result>(
  rows: readonly Row[],
  insert: (batch: readonly Row[]) => PromiseLike<{
    data: Result[] | null;
    error: unknown;
  }>
) => {
  const inserted: Result[] = [];
  const failed: number[] = [];
  for (const batch of chunks(rows, BATCH)) {
    // biome-ignore lint/performance/noAwaitInLoops: one batch at a time
    const { data, error } = await insert(batch);
    if (!error) {
      inserted.push(...(data ?? []));
      continue;
    }
    for (const row of batch) {
      // biome-ignore lint/performance/noAwaitInLoops: the refused batch, row by row
      const single = await insert([row]);
      if (single.error) {
        failed.push(row.line);
      } else {
        inserted.push(...(single.data ?? []));
      }
    }
  }
  return { failed, inserted };
};

/** Applies the planned updates, one organization at a time. */
const updateOrgs = async (
  supabase: ServerClient,
  updates: ImportPlan["updates"],
  orgs: Map<string, ExistingOrg>
) => {
  let updated = 0;
  const failed: number[] = [];
  for (const update of updates) {
    // biome-ignore lint/performance/noAwaitInLoops: small sequential writes
    const { data, error } = await supabase
      .from("partner_orgs")
      .update(update.columns)
      .eq("id", update.id)
      .select(ORG_COLUMNS);
    const [row] = data ?? [];
    if (error || !row) {
      failed.push(update.line);
    } else {
      orgs.set(row.id, row);
      updated += 1;
    }
  }
  return { failed, updated };
};

/** Who each organization already has (by email, or name without one). */
const knownContacts = async (supabase: ServerClient, orgIds: string[]) => {
  const known = new Set<string>();
  for (const ids of chunks([...new Set(orgIds)], BATCH)) {
    const { data } = check(
      // biome-ignore lint/performance/noAwaitInLoops: pages are sequential
      await supabase
        .from("partner_people")
        .select("org_id, name, email")
        .in("org_id", ids)
    );
    for (const person of data ?? []) {
      known.add(contactKey(person.org_id, person));
    }
  }
  return known;
};

/**
 * Adds the people sheet's valid rows to the organizations they name,
 * skipping those with no matching organization or already there.
 */
const importPeople = async (
  supabase: ServerClient,
  rows: readonly PersonSheetRow[],
  orgs: readonly ExistingOrg[]
) => {
  const matched = rows
    .filter((row) => row.errors.length === 0)
    .flatMap((row) => {
      const org = personOrg(row.person, orgs);
      return org ? [{ line: row.line, orgId: org.id, person: row.person }] : [];
    });
  const valid = rows.filter((row) => row.errors.length === 0).length;
  const known = await knownContacts(
    supabase,
    matched.map((entry) => entry.orgId)
  );
  const fresh = matched.filter(({ orgId, person }) => {
    const key = contactKey(orgId, person);
    if (known.has(key)) {
      return false;
    }
    known.add(key);
    return true;
  });
  const result = await insertAll(fresh, (batch) =>
    supabase
      .from("partner_people")
      .insert(
        batch.map(({ orgId, person }) => ({
          email: person.email,
          name: person.name,
          notes: person.notes,
          org_id: orgId,
          phone: person.phone,
          role: person.role,
          source: person.source,
        }))
      )
      .select("id")
  );
  return {
    added: result.inserted.length,
    failed: result.failed,
    skipped: valid - fresh.length,
  };
};

/**
 * Imports the outreach workbook: the organizations sheet (and optionally a
 * people sheet), read again here with the same rules as the preview. Each
 * valid row updates the organization with the same website (any case) or
 * the same name, filling only its non-blank cells, or adds a new one.
 * People are added to the organization their row names, unless it already
 * has someone with that email (or, without one, that name).
 */
export const importPartnerCrm = staffAction(
  SECTION,
  z.object({
    orgs: z.string().min(1).max(MAX_SHEET_CHARS),
    people: z.string().max(MAX_SHEET_CHARS).optional(),
  }),
  async ({ input, supabase }) => {
    const sheet = parseOrgSheet(input.orgs);
    const people = input.people ? parsePeopleSheet(input.people) : null;
    if (sheet.problem || people?.problem) {
      throw new ActionFailure("invalid");
    }
    const existing = await loadOrgs(supabase);
    const plan = planImport(sheet.rows, existing);
    const orgs = new Map(existing.map((org) => [org.id, org]));

    const changed = await updateOrgs(supabase, plan.updates, orgs);
    const added = await insertAll(plan.inserts, (batch) =>
      supabase
        .from("partner_orgs")
        .insert(batch.map((insert) => insert.columns))
        .select(ORG_COLUMNS)
    );
    for (const row of added.inserted) {
      orgs.set(row.id, row);
    }
    const contacts = people
      ? await importPeople(supabase, people.rows, [...orgs.values()])
      : { added: 0, failed: [], skipped: 0 };

    return success("saved", {
      data: {
        failedLines: [...changed.failed, ...added.failed]
          .sort((a, b) => a - b)
          .slice(0, 50),
        inserted: added.inserted.length,
        peopleAdded: contacts.added,
        peopleFailedLines: contacts.failed.slice(0, 50),
        peopleSkipped: contacts.skipped,
        skipped: sheet.rows.filter((row) => row.errors.length > 0).length,
        updated: changed.updated,
      },
    });
  }
);
