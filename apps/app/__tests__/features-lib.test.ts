import ar from "@repo/internationalization/messages/ar.json";
import en from "@repo/internationalization/messages/en.json";
import { createTranslator } from "next-intl";
import { describe, expect, test } from "vitest";
import { wishlistAction } from "@/components/screens/wishlist";
import { toRentalError, toReviewError, toSupportError } from "@/lib/errors";
import {
  describeNotification,
  NOTIFICATION_EVENTS,
  notificationHref,
} from "@/lib/notifications";
import { meetsTier, planForTier, toAllowance } from "@/lib/plus-queries";
import { toRatingMap } from "@/lib/review-queries";
import { canReply, isTicketTopic } from "@/lib/support-queries";

const translators = {
  ar: createTranslator({
    locale: "ar",
    messages: ar,
    namespace: "store.notifications",
  }),
  en: createTranslator({
    locale: "en",
    messages: en,
    namespace: "store.notifications",
  }),
};

const render = (
  notification: Parameters<typeof describeNotification>[0],
  locale: "ar" | "en" = "en"
) => {
  const text = describeNotification(notification, locale);
  const t = translators[locale];
  return { body: t(text.body, text.values), title: t(text.title, text.values) };
};

const sampleData = (event: string) => {
  if (event.startsWith("order_")) {
    return { number: 10_001, tracking: null };
  }
  if (event.startsWith("rental_")) {
    return {
      due_at: "2026-11-20T09:00:00Z",
      name_ar: "إلدن رينغ",
      name_en: "Elden Ring",
    };
  }
  return { number: 1001, subject: "Late delivery" };
};

describe("notifications", () => {
  test.each(NOTIFICATION_EVENTS)("%s renders in both languages", (event) => {
    const kind = event.split("_")[0] as "order" | "rental" | "support";
    for (const locale of ["ar", "en"] as const) {
      const { body, title } = render(
        { data: sampleData(event), event, kind },
        locale
      );
      expect(title.length).toBeGreaterThan(0);
      expect(body).not.toContain("{");
      expect(body).not.toContain("store.notifications");
    }
  });

  test("interpolates order, rental and ticket data", () => {
    expect(
      render({
        data: { number: 10_001, tracking: "IQ123" },
        event: "order_shipped",
        kind: "order",
      }).body
    ).toBe("Order #10001 has shipped. Tracking number: IQ123.");
    expect(
      render({
        data: { number: 10_001, tracking: null },
        event: "order_shipped",
        kind: "order",
      }).body
    ).toBe("Order #10001 has shipped.");

    const rental = {
      data: sampleData("rental_overdue"),
      event: "rental_overdue",
      kind: "rental" as const,
    };
    expect(render(rental).body).toBe(
      "Elden Ring was due on 20 Nov 2026. Please return it."
    );
    // The Arabic name, with Latin digits.
    expect(render(rental, "ar").body).toContain("إلدن رينغ");
    expect(render(rental, "ar").body).toContain("2026");

    expect(
      render({
        data: { number: 1001, subject: "Late delivery" },
        event: "support_reply",
        kind: "support",
      }).body
    ).toBe("We replied to ticket #1001: Late delivery");

    const available = {
      data: { name_ar: "كثيب", name_en: "Dune" },
      event: "product_available",
      kind: "system" as const,
    };
    expect(render(available).body).toBe("Dune is on offer on The IDEA now.");
    expect(render(available, "ar").body).toContain("كثيب");
  });

  test("falls back for unknown events and odd data", () => {
    expect(
      render({ data: {}, event: "promo_spring_sale", kind: "promo" })
    ).toEqual({
      body: "Open to see the details.",
      title: "News from The IDEA",
    });
    // Data that isn't an object never breaks the text.
    expect(
      render({ data: [1, 2], event: "order_paid", kind: "order" }).body
    ).toBe("We received the payment for order #.");
  });

  test("only follows paths on this site", () => {
    expect(notificationHref("/pass/orders/o1")).toBe("/pass/orders/o1");
    // Links stored before Your Pass moved under /pass.
    expect(notificationHref("/orders/o1")).toBe("/pass/orders/o1");
    expect(notificationHref("/pass/plus?plan=p1")).toBe("/plus/plan?plan=p1");
    // Your Plus is now several pages: the event picks one.
    expect(notificationHref("/plus#yours")).toBe("/plus/plan");
    expect(
      notificationHref("/plus#yours", "en", "", {
        event: "plus_swap_done",
        kind: "plus",
      })
    ).toBe("/pass/at-home");
    expect(notificationHref("/pass/settings#guardian")).toBe("/pass/family");
    expect(notificationHref("/events")).toBe("/events");
    // Company pages are on Partners, at the root of its site.
    expect(
      notificationHref(
        "/business/invoices",
        "ar",
        "https://partners.theideaiq.com"
      )
    ).toBe("https://partners.theideaiq.com/ar/settings/invoices");
    // Links stored while detail pages took a query parameter.
    expect(notificationHref("/orders/view?id=o1")).toBe("/pass/orders/o1");
    expect(notificationHref("/support/view?id=t%201")).toBe("/help/t%201");
    expect(notificationHref("/store/product?slug=ps5&add=1")).toBe(
      "/store/ps5?add=1"
    );
    expect(notificationHref("/orders/view")).toBe("/pass/orders/view");
    expect(notificationHref("https://evil.example")).toBeNull();
    expect(notificationHref("//evil.example")).toBeNull();
    expect(notificationHref(null)).toBeNull();
  });
});

describe("rental tiers", () => {
  test("members need the item's tier", () => {
    expect(meetsTier(null, 0)).toBe(true);
    expect(meetsTier(undefined, 1)).toBe(true);
    expect(meetsTier(2, 1)).toBe(false);
    expect(meetsTier(2, 2)).toBe(true);
    expect(meetsTier(2, 3)).toBe(true);
  });

  test("names the plan that unlocks an item", () => {
    const plans = [
      { name: "Plus Extra", tier: 2 },
      { name: "Plus", tier: 1 },
      { name: "Plus Max", tier: 3 },
    ];
    expect(planForTier(plans, 2)?.name).toBe("Plus Extra");
    expect(planForTier(plans.slice(2), 2)?.name).toBe("Plus Max");
    expect(planForTier(plans, 4)).toBeUndefined();
    expect(planForTier(undefined, 1)).toBeUndefined();
  });

  test("allowance carries the tier", () => {
    expect(toAllowance([{ in_use: 0, slots: 2, tier: 3 }]).tier).toBe(3);
    expect(toAllowance([{ in_use: 0, slots: 2 }]).tier).toBe(0);
  });

  test("maps the database's tier error", () => {
    expect(toRentalError({ message: "This item needs a higher plan" })).toBe(
      "needsTier"
    );
  });
});

describe("support", () => {
  test("errors", () => {
    expect(toSupportError({ message: "This ticket is closed" })).toBe("closed");
    expect(
      toSupportError({ message: "Ticket not found or already closed" })
    ).toBe("closed");
    expect(toSupportError({ message: "Order not found" })).toBe(
      "orderNotFound"
    );
    expect(toSupportError(new Error("network"))).toBe("unknown");
  });

  test("replies and topics", () => {
    expect(canReply("open")).toBe(true);
    expect(canReply("pending")).toBe(true);
    expect(canReply("resolved")).toBe(true);
    expect(canReply("closed")).toBe(false);
    expect(isTicketTopic("order")).toBe(true);
    expect(isTicketTopic("refund")).toBe(false);
    expect(isTicketTopic(null)).toBe(false);
  });
});

describe("reviews", () => {
  test("ratings by product", () => {
    const map = toRatingMap([
      { average: 4.5, count: 2, product_id: "p1" },
      { average: null, count: 0, product_id: "p2" },
      { average: 3, count: 1, product_id: null },
    ]);
    expect(map.get("p1")).toEqual({ average: 4.5, count: 2 });
    expect(map.has("p2")).toBe(false);
    expect(map.size).toBe(1);
    expect(toRatingMap(null).size).toBe(0);
  });

  test("errors", () => {
    expect(toReviewError({ code: "23505", message: "duplicate key" })).toBe(
      "duplicate"
    );
    expect(toReviewError({ message: "Account suspended" })).toBe("suspended");
    expect(toReviewError({})).toBe("unknown");
  });
});

describe("wishlist", () => {
  const product = (overrides: object = {}) =>
    ({
      category_id: null,
      compare_at_price: null,
      condition: "new",
      currency: "IQD",
      featured: false,
      id: "p1",
      images: [],
      kind: "sale",
      name_ar: "سماعة",
      name_en: "Headset",
      price: 50_000,
      slug: "headset",
      status: "active",
      stock_count: 3,
      variants: [{ active: true, id: "v0", price: 50_000 }],
      ...overrides,
    }) as unknown as Parameters<typeof wishlistAction>[0];

  test("what a saved product can do", () => {
    expect(wishlistAction(product())).toBe("move");
    expect(
      wishlistAction(
        product({
          variants: [
            { active: true, id: "v1", price: 50_000 },
            { active: true, id: "v2", price: 60_000 },
          ],
        })
      )
    ).toBe("choose");
    expect(wishlistAction(product({ stock_count: 0 }))).toBe("unavailable");
    expect(wishlistAction(product({ status: "archived" }))).toBe("unavailable");
    expect(wishlistAction(product({ kind: "rental" }))).toBe("rent");
  });
});
