import { describe, expect, test } from "vitest";
import { type Audience, parseCriteria, selectRecipients } from "./recipients";

const audience: Audience = {
  contacts: [
    { status: "vip", tags: ["gamer"], user_id: "a" },
    { status: "customer", tags: ["Books"], user_id: "b" },
    { status: "lead", tags: [], user_id: "c" },
  ],
  emails: new Map([
    ["a", "a@example.com"],
    ["b", "b@example.com"],
    ["c", "c@example.com"],
    // "d" signed up with a phone number only.
  ]),
  plusMembers: new Set(["a"]),
  profiles: [
    { id: "a", locale: "ar" },
    { id: "b", locale: "en" },
    { id: "c", locale: "ckb" },
    { id: "d", locale: "ar" },
  ],
};

const ids = (criteria: Parameters<typeof selectRecipients>[1]) =>
  selectRecipients(audience, criteria).map((recipient) => recipient.userId);

describe("recipient resolution", () => {
  test("no criteria: every opted-in profile with an email", () => {
    expect(ids({})).toEqual(["a", "b", "c"]);
    expect(selectRecipients(audience, {})[2]).toEqual({
      email: "c@example.com",
      locale: "ar",
      userId: "c",
    });
  });

  test("each criterion narrows the audience", () => {
    expect(ids({ crm_status: ["vip", "customer"] })).toEqual(["a", "b"]);
    expect(ids({ tags: ["books"] })).toEqual(["b"]);
    expect(ids({ plus_member: true })).toEqual(["a"]);
    expect(ids({ plus_member: false })).toEqual(["b", "c"]);
    expect(ids({ locale: "en" })).toEqual(["b"]);
  });

  test("criteria combine with AND", () => {
    expect(ids({ crm_status: ["vip"], locale: "en" })).toEqual([]);
    expect(ids({ plus_member: false, tags: ["books", "gamer"] })).toEqual([
      "b",
    ]);
  });

  test("malformed stored criteria match nobody", () => {
    expect(parseCriteria({ crm_status: "vip" })).toBeNull();
    expect(parseCriteria({ everyone: true })).toBeNull();
    expect(parseCriteria(null)).toEqual({});
    expect(parseCriteria({ locale: "ar", plus_member: true })).toEqual({
      locale: "ar",
      plus_member: true,
    });
  });
});
