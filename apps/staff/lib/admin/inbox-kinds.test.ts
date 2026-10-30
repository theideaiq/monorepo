import { describe, expect, test } from "vitest";
import {
  byWaiting,
  countByKind,
  type InboxRow,
  inboxHref,
  isLate,
  mineOnly,
  parseInboxFilter,
  stepSelection,
  visibleKinds,
  waitingFor,
} from "./inbox-kinds";

const row = (overrides: Partial<InboxRow>): InboxRow => ({
  assignee: null,
  assigneeName: null,
  detail: "",
  href: "/support/1",
  id: "1",
  key: "support:1",
  kind: "support",
  since: "2026-10-30T10:00:00.000Z",
  subtype: "Ticket",
  title: "A ticket",
  ...overrides,
});

describe("the Inbox's filter", () => {
  test("reads a known kind and Mine from the address", () => {
    expect(parseInboxFilter({ kind: "returns", mine: "1" })).toEqual({
      kind: "returns",
      mine: true,
    });
    expect(parseInboxFilter({ kind: "nope" })).toEqual({
      kind: null,
      mine: false,
    });
    expect(parseInboxFilter({ kind: ["shops", "x"], mine: "0" })).toEqual({
      kind: "shops",
      mine: false,
    });
  });

  test("writes the address back", () => {
    expect(inboxHref({ kind: null, mine: false })).toBe("/");
    expect(inboxHref({ kind: "checks", mine: false })).toBe("/?kind=checks");
    expect(inboxHref({ kind: "support", mine: true })).toBe(
      "/?kind=support&mine=1"
    );
  });
});

describe("the Inbox's rows", () => {
  const rows = [
    row({ key: "a", since: "2026-10-30T12:00:00.000Z" }),
    row({
      assignee: "me",
      key: "b",
      kind: "submissions",
      since: "2026-10-28T12:00:00.000Z",
    }),
    row({ assignee: "other", key: "c", since: "2026-10-29T12:00:00.000Z" }),
  ];

  test("oldest first", () => {
    expect(byWaiting(rows).map((item) => item.key)).toEqual(["b", "c", "a"]);
  });

  test("Mine keeps what's assigned to you", () => {
    expect(mineOnly(rows, true, "me").map((item) => item.key)).toEqual(["b"]);
    expect(mineOnly(rows, false, "me")).toHaveLength(3);
  });

  test("counts every kind", () => {
    expect(countByKind(rows)).toEqual({
      applications: 0,
      checks: 0,
      returns: 0,
      shops: 0,
      submissions: 1,
      support: 2,
      verifications: 0,
    });
  });
});

describe("time waiting", () => {
  const now = new Date("2026-10-30T12:00:00.000Z");

  test("in the largest whole unit", () => {
    expect(waitingFor("2026-10-30T11:59:50.000Z", now)).toEqual({
      unit: "minutes",
      value: 1,
    });
    expect(waitingFor("2026-10-30T11:10:00.000Z", now)).toEqual({
      unit: "minutes",
      value: 50,
    });
    expect(waitingFor("2026-10-30T06:30:00.000Z", now)).toEqual({
      unit: "hours",
      value: 5,
    });
    expect(waitingFor("2026-10-27T11:00:00.000Z", now)).toEqual({
      unit: "days",
      value: 3,
    });
  });

  test("a day or more is late", () => {
    expect(isLate("2026-10-29T12:00:00.000Z", now)).toBe(true);
    expect(isLate("2026-10-29T13:00:00.000Z", now)).toBe(false);
  });
});

describe("J and K", () => {
  const keys = ["a", "b", "c"];

  test("start at the first row", () => {
    expect(stepSelection(keys, null, 1)).toBe("a");
    expect(stepSelection(keys, "gone", -1)).toBe("a");
  });

  test("move and stop at the ends", () => {
    expect(stepSelection(keys, "a", 1)).toBe("b");
    expect(stepSelection(keys, "c", 1)).toBe("c");
    expect(stepSelection(keys, "a", -1)).toBe("a");
    expect(stepSelection([], null, 1)).toBeNull();
  });
});

test("each role sees the kinds of its sections", () => {
  expect(visibleKinds("editor")).toEqual(["applications", "submissions"]);
  expect(visibleKinds("support")).toEqual([
    "support",
    "verifications",
    "returns",
    "shops",
  ]);
  expect(visibleKinds("superadmin")).toHaveLength(7);
  expect(visibleKinds(null)).toEqual([]);
});
