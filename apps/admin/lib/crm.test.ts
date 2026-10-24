import { describe, expect, test } from "vitest";
import { crmContactSchema, orderByContact } from "./crm";

const userId = "00000000-0000-4000-8000-000000000001";

describe("CRM", () => {
  test("last contact is read as Baghdad time; empty clears it", () => {
    const parsed = crmContactSchema.parse({
      lastContactedAt: "2026-11-04T18:30",
      status: "customer",
      tags: "Gamer, books",
      userId,
    });
    expect(parsed.lastContactedAt).toBe("2026-11-04T15:30:00.000Z");
    expect(parsed.tags).toEqual(["gamer", "books"]);
    expect(
      crmContactSchema.parse({ lastContactedAt: "", status: "lead", userId })
        .lastContactedAt
    ).toBeNull();
    expect(
      crmContactSchema.safeParse({
        lastContactedAt: "yesterday",
        status: "lead",
        userId,
      }).success
    ).toBe(false);
  });

  test("sorting by contact date", () => {
    const rows = [
      { last_contacted_at: "2026-10-01T10:00:00Z", user_id: "a" },
      { last_contacted_at: null, user_id: "b" },
      { last_contacted_at: "2026-11-01T10:00:00Z", user_id: "c" },
      { last_contacted_at: null, user_id: "d" },
    ];
    expect(
      orderByContact(rows, "contactedRecent").map((row) => row.user_id)
    ).toEqual(["c", "a", "b", "d"]);
    expect(
      orderByContact(rows, "contactedOldest").map((row) => row.user_id)
    ).toEqual(["b", "d", "a", "c"]);
  });
});
