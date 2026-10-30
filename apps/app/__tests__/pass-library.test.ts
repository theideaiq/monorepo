import en from "@repo/internationalization/messages/en.json";
import { createTranslator } from "next-intl";
import { describe, expect, test } from "vitest";
import { isActiveItem, navItems } from "@/components/nav-items";
import { moveInQueue } from "@/components/pass/queue";
import { isAtHome, isPast } from "@/components/pass/rentals";
import {
  ageOn,
  baghdadToday,
  familyErrorKey,
  isKidBirthday,
} from "@/lib/family";
import { describeNotification } from "@/lib/notifications";
import { todayItems } from "@/lib/pass-today";
import { toAvailability } from "@/lib/plus-availability";
import {
  isSettingsSection,
  sectionKey,
  settingsPath,
  settingsSections,
} from "@/lib/settings";

describe("the queue", () => {
  test("moves an item to another place", () => {
    expect(moveInQueue(["a", "b", "c"], "c", 0)).toEqual(["c", "a", "b"]);
    expect(moveInQueue(["a", "b", "c"], "a", 1)).toEqual(["b", "a", "c"]);
    expect(moveInQueue(["a", "b", "c"], "b", 2)).toEqual(["a", "c", "b"]);
    expect(moveInQueue(["a", "b"], "b", 5)).toEqual(["a", "b"]);
    expect(moveInQueue(["a", "b"], "x", 0)).toEqual(["a", "b"]);
  });

  test("reads Plus availability in words", () => {
    expect(toAvailability("now")).toBe("now");
    expect(toAvailability("coming")).toBe("coming");
    expect(toAvailability("soon")).toBeNull();
    expect(toAvailability(null)).toBeNull();
  });
});

describe("At home and past rentals", () => {
  test("at home is a Plus rental on its way, at home or late", () => {
    expect(isAtHome({ kind: "plus", status: "active" })).toBe(true);
    expect(isAtHome({ kind: "plus", status: "requested" })).toBe(true);
    expect(isAtHome({ kind: "plus", status: "returned" })).toBe(false);
    expect(isAtHome({ kind: "single", status: "active" })).toBe(false);
    expect(isPast({ status: "kept" })).toBe(true);
    expect(isPast({ status: "overdue" })).toBe(false);
  });
});

describe("Today on the Pass", () => {
  const now = new Date("2027-03-01T09:00:00Z");

  test("is empty when nothing is due", () => {
    expect(
      todayItems({
        events: [
          {
            id: "e1",
            slug: "later",
            starts_at: "2027-03-09T17:00:00Z",
            title: "Later",
          },
        ],
        familyRequests: 0,
        now,
        orders: [{ id: "o1", number: 1, status: "delivered" }],
        rentals: [
          {
            due_at: "2027-03-20T09:00:00Z",
            id: "r1",
            kind: "plus",
            name: "Elden Ring",
            status: "active",
          },
        ],
      })
    ).toEqual([]);
  });

  test("lists deliveries, rentals due back, today's events and requests", () => {
    const items = todayItems({
      events: [
        {
          id: "e1",
          slug: "quiz",
          starts_at: "2027-03-01T17:00:00Z",
          title: "Quiz night",
        },
      ],
      familyRequests: 2,
      now,
      orders: [{ id: "o1", number: 10_001, status: "shipped" }],
      rentals: [
        {
          due_at: "2027-03-02T09:00:00Z",
          id: "r1",
          kind: "plus",
          name: "Elden Ring",
          status: "active",
        },
        {
          due_at: "2027-02-20T09:00:00Z",
          id: "r2",
          kind: "plus",
          name: "Dune",
          status: "overdue",
        },
      ],
    });
    expect(items.map((item) => item.kind)).toEqual([
      "delivery",
      "dueBack",
      "dueBack",
      "event",
      "family",
    ]);
    expect(items[2]).toMatchObject({ late: true, name: "Dune" });
  });
});

describe("Family", () => {
  test("counts age in whole years", () => {
    expect(ageOn("2015-06-10", "2027-06-09")).toBe(11);
    expect(ageOn("2015-06-10", "2027-06-10")).toBe(12);
    expect(Number.isNaN(ageOn("", "2027-06-10"))).toBe(true);
  });

  test("kids' profiles are for under 13s", () => {
    expect(isKidBirthday("2020-01-01", "2027-03-01")).toBe(true);
    expect(isKidBirthday("2014-02-28", "2027-03-01")).toBe(false);
    expect(isKidBirthday("2028-01-01", "2027-03-01")).toBe(false);
    expect(baghdadToday(new Date("2027-03-01T22:30:00Z"))).toBe("2027-03-02");
  });

  test("explains a refusal", () => {
    expect(
      familyErrorKey(new Error("Kids' profiles are for under 13s; teens"))
    ).toBe("notUnder13");
    expect(familyErrorKey(new Error("Not for this age"))).toBe("ageRating");
    expect(familyErrorKey(new Error("At most 6 kids' profiles"))).toBe(
      "manyKids"
    );
    expect(familyErrorKey(new Error("boom"))).toBe("failed");
  });

  test("its notifications read in words", () => {
    const t = createTranslator({
      locale: "en",
      messages: en,
      namespace: "store.notifications",
    });
    const text = describeNotification(
      {
        data: { name_ar: "دون", name_en: "Dune", teen: "Ali" },
        event: "family_request",
        kind: "plus",
      },
      "en"
    );
    expect(t(text.body, text.values)).toBe("Ali asked for Dune.");
  });
});

describe("the Pass menu and Settings", () => {
  test("Tickets holds Applications", () => {
    const tickets = navItems.find((item) => item.key === "tickets");
    expect(tickets && isActiveItem("/pass/applications", tickets)).toBe(true);
    const pass = navItems.find((item) => item.key === "pass");
    expect(pass && isActiveItem("/pass/orders", pass)).toBe(false);
  });

  test("every Settings section is a page", () => {
    expect(settingsSections).toHaveLength(8);
    expect(settingsPath("sign-in")).toBe("/pass/settings/sign-in");
    expect(settingsPath()).toBe("/pass/settings");
    expect(sectionKey("sign-in")).toBe("signIn");
    expect(isSettingsSection("phone")).toBe(true);
    expect(isSettingsSection("more")).toBe(false);
    for (const section of settingsSections) {
      expect(
        en.app.settings.sections[sectionKey(section)].title.length
      ).toBeGreaterThan(0);
    }
  });
});
