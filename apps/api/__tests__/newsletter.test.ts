import type { AdminClient } from "@repo/database/admin";
import { describe, expect, test, vi } from "vitest";
import {
  type AudienceRow,
  type Contact,
  type ContactsApi,
  planSync,
  splitName,
  syncNewsletterContacts,
} from "../lib/newsletter";

const row = (overrides: Partial<AudienceRow>): AudienceRow => ({
  email: "a@example.com",
  full_name: "Ali Hassan",
  marketing_opt_in: false,
  opt_in_changed_at: null,
  suspended: false,
  synced_at: null,
  user_id: "a",
  ...overrides,
});

const contact = (overrides: Partial<Contact>): Contact => ({
  email: "a@example.com",
  first_name: "Ali",
  id: "c-a",
  last_name: "Hassan",
  unsubscribed: true,
  ...overrides,
});

describe("splitName", () => {
  test("first word, then the rest", () => {
    expect(splitName("Ali Hassan Kareem")).toEqual({
      firstName: "Ali",
      lastName: "Hassan Kareem",
    });
    expect(splitName(" سارة ")).toEqual({ firstName: "سارة", lastName: null });
    expect(splitName(null)).toEqual({ firstName: null, lastName: null });
  });
});

describe("planSync", () => {
  test("new accounts are pushed, unsubscribed unless opted in", () => {
    const plan = planSync(
      [
        row({}),
        row({ email: "B@Example.com", marketing_opt_in: true, user_id: "b" }),
      ],
      []
    );
    expect(plan.optOut).toEqual([]);
    expect(plan.remove).toEqual([]);
    expect(plan.push).toEqual([
      {
        contactId: undefined,
        email: "a@example.com",
        firstName: "Ali",
        lastName: "Hassan",
        unsubscribed: true,
        userId: "a",
      },
      expect.objectContaining({
        email: "b@example.com",
        unsubscribed: false,
        userId: "b",
      }),
    ]);
  });

  test("contacts already in step are left alone", () => {
    expect(planSync([row({})], [contact({})]).push).toEqual([]);
  });

  test("suspended accounts are unsubscribed even when opted in", () => {
    const plan = planSync(
      [row({ marketing_opt_in: true, suspended: true })],
      [contact({ unsubscribed: false })]
    );
    expect(plan.optOut).toEqual([]);
    expect(plan.push).toEqual([
      expect.objectContaining({ contactId: "c-a", unsubscribed: true }),
    ]);
  });

  test("an unsubscribe in Resend turns the opt-in off", () => {
    const plan = planSync(
      [
        row({
          marketing_opt_in: true,
          opt_in_changed_at: "2026-10-01T10:00:00+00:00",
          synced_at: "2026-10-02T10:00:00+00:00",
        }),
      ],
      [contact({ unsubscribed: true })]
    );
    expect(plan.optOut).toEqual(["a"]);
    expect(plan.push).toEqual([]);
  });

  test("a contact that unsubscribed before it was ever pushed also wins", () => {
    const plan = planSync(
      [row({ marketing_opt_in: true })],
      [contact({ unsubscribed: true })]
    );
    expect(plan.optOut).toEqual(["a"]);
  });

  test("opting in again after the last push resubscribes the contact", () => {
    const plan = planSync(
      [
        row({
          marketing_opt_in: true,
          opt_in_changed_at: "2026-10-03T10:00:00Z",
          synced_at: "2026-10-02T10:00:00+00:00",
        }),
      ],
      [contact({ unsubscribed: true })]
    );
    expect(plan.optOut).toEqual([]);
    expect(plan.push).toEqual([
      expect.objectContaining({ contactId: "c-a", unsubscribed: false }),
    ]);
  });

  test("name changes are pushed; contacts without an account are removed", () => {
    const plan = planSync(
      [row({ full_name: "Ali" })],
      [contact({}), contact({ email: "gone@example.com", id: "c-gone" })]
    );
    expect(plan.push).toEqual([
      expect.objectContaining({ firstName: "Ali", lastName: null }),
    ]);
    expect(plan.remove.map((item) => item.id)).toEqual(["c-gone"]);
  });
});

const ok = <T>(data: T) => Promise.resolve({ data, error: null });

const fakeAdmin = (rows: AudienceRow[]) => {
  const optedOut: string[][] = [];
  const marked: string[][] = [];
  const admin = {
    from: () => ({
      update: () => ({
        in: (_column: string, ids: string[]) => {
          optedOut.push(ids);
          return ok(null);
        },
      }),
    }),
    rpc: (name: string, args?: { user_ids: string[] }) => {
      if (name === "mark_newsletter_synced") {
        marked.push(args?.user_ids ?? []);
        return ok(null);
      }
      return {
        range: (from: number, to: number) => ok(rows.slice(from, to + 1)),
      };
    },
  };
  return { admin: admin as unknown as AdminClient, marked, optedOut };
};

const fakeContacts = (listed: Contact[]) => {
  const api = {
    create: vi.fn(() => ok({ id: "new", object: "contact" })),
    list: vi.fn(() => ok({ data: listed, has_more: false, object: "list" })),
    remove: vi.fn(() => ok({ deleted: true })),
    segments: { add: vi.fn(() => ok({ id: "x" })) },
    update: vi.fn(() => ok({ id: "x", object: "contact" })),
  };
  return { api, contacts: api as unknown as ContactsApi };
};

describe("syncNewsletterContacts", () => {
  const options = { deadline: Date.now() + 60_000, gapMs: 0, sleep: vi.fn() };

  test("pulls unsubscribes, pushes changes, removes orphans", async () => {
    const { admin, marked, optedOut } = fakeAdmin([
      row({ marketing_opt_in: true }),
      row({ email: "b@example.com", full_name: null, user_id: "b" }),
      row({
        email: "c@example.com",
        full_name: "Sara",
        marketing_opt_in: true,
        user_id: "c",
      }),
    ]);
    const { api, contacts } = fakeContacts([
      contact({ unsubscribed: true }),
      contact({
        email: "c@example.com",
        first_name: "Sarah",
        id: "c-c",
        last_name: null,
        unsubscribed: false,
      }),
      contact({ email: "gone@example.com", id: "c-gone" }),
    ]);

    const result = await syncNewsletterContacts({
      ...options,
      admin,
      contacts,
      segmentId: "seg_1",
    });

    expect(optedOut).toEqual([["a"]]);
    expect(api.list).toHaveBeenCalledWith({ limit: 100, segmentId: "seg_1" });
    expect(api.create).toHaveBeenCalledWith({
      email: "b@example.com",
      firstName: undefined,
      lastName: undefined,
      segments: [{ id: "seg_1" }],
      unsubscribed: true,
    });
    expect(api.update).toHaveBeenCalledWith({
      firstName: "Sara",
      id: "c-c",
      lastName: null,
      unsubscribed: false,
    });
    expect(api.remove).toHaveBeenCalledWith({ id: "c-gone" });
    expect(marked).toEqual([["b", "c"]]);
    expect(result).toEqual({
      accounts: 3,
      contacts: 3,
      failed: 0,
      optedOut: 1,
      partial: false,
      pushed: 2,
      removed: 1,
    });
  });

  test("an existing Resend contact is updated and added to the segment", async () => {
    const { admin } = fakeAdmin([row({})]);
    const { api, contacts } = fakeContacts([]);
    api.create.mockReturnValueOnce(
      Promise.resolve({
        data: null,
        error: { message: "exists", name: "validation_error" },
      }) as never
    );
    const result = await syncNewsletterContacts({
      ...options,
      admin,
      contacts,
      segmentId: "seg_1",
    });
    expect(api.update).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@example.com", unsubscribed: true })
    );
    expect(api.segments.add).toHaveBeenCalledWith({
      email: "a@example.com",
      segmentId: "seg_1",
    });
    expect(result.pushed).toBe(1);
  });

  test("never removes contacts when no account came back", async () => {
    const { admin } = fakeAdmin([]);
    const { api, contacts } = fakeContacts([contact({})]);
    await syncNewsletterContacts({
      ...options,
      admin,
      contacts,
      segmentId: "seg_1",
    });
    expect(api.remove).not.toHaveBeenCalled();
  });

  test("stops at the deadline and marks what was pushed", async () => {
    const { admin, marked } = fakeAdmin([
      row({}),
      row({ email: "b@example.com", user_id: "b" }),
    ]);
    const { api, contacts } = fakeContacts([]);
    let now = 1000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    api.create.mockImplementation(() => {
      now = 5000;
      return ok({ id: "new", object: "contact" });
    });
    const result = await syncNewsletterContacts({
      ...options,
      admin,
      contacts,
      deadline: 4000,
      segmentId: "seg_1",
    });
    vi.restoreAllMocks();
    expect(result.partial).toBe(true);
    expect(result.pushed).toBe(1);
    expect(marked).toEqual([["a"]]);
  });

  test("retries a rate-limited request", async () => {
    const { admin } = fakeAdmin([row({})]);
    const { api, contacts } = fakeContacts([]);
    api.create.mockReturnValueOnce(
      Promise.resolve({
        data: null,
        error: { message: "slow down", name: "rate_limit_exceeded" },
      }) as never
    );
    const result = await syncNewsletterContacts({
      ...options,
      admin,
      contacts,
      segmentId: "seg_1",
    });
    expect(api.create).toHaveBeenCalledTimes(2);
    expect(result.pushed).toBe(1);
  });
});
