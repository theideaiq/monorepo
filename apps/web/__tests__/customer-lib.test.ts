import { liveVariants } from "@repo/commerce";
import { describe, expect, test } from "vitest";
import { isActivePath } from "@/components/nav-items";
import {
  accountPhone,
  emptyAddress,
  governorateName,
  validateAddress,
} from "@/lib/address";
import { pickVariant, variantForDeepLink } from "@/lib/app-product";
import {
  type CartItem,
  cartCount,
  clampQuantity,
  freeDeliveryRemaining,
  lineProblem,
  summarizeCart,
  toCartLine,
} from "@/lib/cart";
import {
  calendarFeedUrl,
  canWithdraw,
  upcomingRsvps,
  validateSubmission,
  webcalUrl,
} from "@/lib/community-queries";
import { toCheckoutError, toRentalError, toRsvpError } from "@/lib/errors";
import { seatsLeft } from "@/lib/events";
import { needsOnboarding } from "@/lib/onboarding";
import { orderPath } from "@/lib/order-checkout";
import { isActiveOrder, itemCount, orderProgress } from "@/lib/orders";
import { toAllowance } from "@/lib/plus-queries";

const product = (
  overrides: Partial<NonNullable<CartItem["product"]>> = {}
) => ({
  compare_at_price: null,
  condition: "new" as const,
  currency: "IQD",
  id: "p1",
  images: [],
  kind: "sale" as const,
  name_ar: "منتج",
  name_en: "Product",
  price: 10_000,
  slug: "product",
  status: "active" as const,
  stock_count: 5,
  ...overrides,
});

const item = (overrides: Partial<CartItem> = {}): CartItem => ({
  condition: null,
  id: "c1",
  product: product(),
  product_id: "p1",
  quantity: 2,
  variant: null,
  variant_id: "v0",
  ...overrides,
});

const settings = { shippingFee: 5000 };

describe("cart", () => {
  test("a used copy of a new product is priced and counted from its offer", () => {
    const used = toCartLine(
      item({ condition: "used", offer: { available: 1, price: 6000 } })
    );
    expect(used.unitPrice).toBe(6000);
    expect(used.available).toBe(1);
    expect(used.buyable).toBe(true);
    // No used copy left: the line can't be ordered.
    expect(toCartLine(item({ condition: "used", offer: null })).buyable).toBe(
      false
    );
    // The product's own condition is the main listing.
    expect(toCartLine(item({ condition: "new" })).unitPrice).toBe(10_000);
  });

  test("prices lines like create_order(), variant price first", () => {
    expect(toCartLine(item()).unitPrice).toBe(10_000);
    const withVariant = toCartLine(
      item({
        variant: {
          attributes: { Color: "Black" },
          compare_at_price: null,
          id: "v1",
          images: [],
          label_ar: "أسود",
          label_en: "Black",
          price: 12_000,
          stock_count: 1,
        },
        variant_id: "v1",
      })
    );
    expect(withVariant.unitPrice).toBe(12_000);
    expect(withVariant.available).toBe(1);
  });

  test("totals the orderable lines with delivery", () => {
    const summary = summarizeCart([item()], settings);
    expect(summary.totals).toEqual({
      count: 2,
      shippingFee: 5000,
      subtotal: 20_000,
      total: 25_000,
    });
    expect(summary.canCheckout).toBe(true);
  });

  test("blocks checkout on unavailable or short lines", () => {
    const archived = item({ product: product({ status: "archived" }) });
    const short = item({ id: "c2", quantity: 9 });
    const summary = summarizeCart([archived, short], settings);
    expect(summary.canCheckout).toBe(false);
    expect(summary.problems).toBe(2);
    expect(summary.totals.subtotal).toBe(90_000);
    expect(lineProblem(toCartLine(archived))).toBe("unavailable");
    expect(lineProblem(toCartLine(short))).toBe("notEnoughStock");
    expect(
      lineProblem(toCartLine(item({ product: product({ stock_count: 0 }) })))
    ).toBe("outOfStock");
    expect(lineProblem(toCartLine(item()))).toBeNull();
  });

  test("counts items and clamps quantities", () => {
    expect(cartCount([{ quantity: 2 }, { quantity: 3 }])).toBe(5);
    expect(clampQuantity(0, 5)).toBe(1);
    expect(clampQuantity(50, 99)).toBe(20);
    expect(clampQuantity(4, 2)).toBe(2);
  });

  test("says how far a zone's free delivery is", () => {
    expect(freeDeliveryRemaining(60_000, 150_000)).toBe(90_000);
    expect(freeDeliveryRemaining(160_000, 150_000)).toBe(0);
    expect(freeDeliveryRemaining(0, 150_000)).toBe(0);
    expect(freeDeliveryRemaining(1, null)).toBe(0);
  });
});

describe("product variants", () => {
  const base = { price: 100, product_variants: [] };
  const variants = [
    { id: "a", price: 150, stock_count: 0 },
    { id: "b", price: 100, stock_count: 4 },
  ];

  test("a product with one variant has it chosen", () => {
    const single = { ...base, product_variants: [variants[1]] };
    expect(pickVariant(single, null)).toMatchObject({
      price: 100,
      ready: true,
      stock: 4,
    });
  });

  test("products with several variants wait for a choice", () => {
    const withVariants = { ...base, product_variants: variants };
    expect(pickVariant(withVariants, null)).toMatchObject({
      ready: false,
      stock: 0,
    });
    expect(pickVariant(withVariants, "a")).toMatchObject({
      price: 150,
      ready: true,
      stock: 0,
    });
    expect(pickVariant(withVariants, "b")).toMatchObject({
      price: 100,
      stock: 4,
    });
  });

  test("hidden variants can't be chosen", () => {
    const withHidden = {
      ...base,
      product_variants: [{ ...variants[0], active: false }, variants[1]],
    };
    expect(pickVariant(withHidden, "a").variant?.id).toBe("b");
    expect(liveVariants(withHidden.product_variants)).toHaveLength(1);
  });

  test("deep links preselect only an unambiguous variant", () => {
    expect(variantForDeepLink([variants[0]])?.id).toBe("a");
    expect(variantForDeepLink(variants)).toBeUndefined();
    expect(variantForDeepLink([])).toBeUndefined();
  });
});

describe("delivery address", () => {
  const filled = {
    ...emptyAddress("0770 123 4567"),
    address: " Karrada, street 62 ",
    city: "Baghdad",
    fullName: " Sara Ali ",
    governorate: "baghdad",
  };

  test("normalizes the payload create_order() expects", () => {
    expect(validateAddress(filled)).toEqual({
      errors: [],
      shipping: {
        address: "Karrada, street 62",
        city: "Baghdad",
        full_name: "Sara Ali",
        governorate: "baghdad",
        notes: "",
        phone: "+9647701234567",
      },
      zoneId: null,
    });
  });

  test("with the courier's areas known, the city must be one of them", () => {
    const areas = ["الكرادة", "المنصور"];
    expect(validateAddress(filled, { areas }).errors).toEqual(["city"]);
    expect(
      validateAddress({ ...filled, city: " الكرادة " }, { areas }).errors
    ).toEqual([]);
    // Unknown areas (before the first copy): any city goes.
    expect(validateAddress(filled, { areas: [] }).errors).toEqual([]);
  });

  test("pickup needs only a name and a phone", () => {
    expect(
      validateAddress(
        { ...filled, address: "", governorate: "" },
        { fulfilment: "pickup" }
      )
    ).toMatchObject({
      errors: [],
      shipping: { address: "", governorate: "" },
      zoneId: null,
    });
  });

  test("delivery takes the zone's governorate", () => {
    const zones = [{ governorate: "basra", id: "zone-basra" }];
    expect(
      validateAddress({ ...filled, zoneId: "zone-basra" }, { zones })
    ).toMatchObject({
      errors: [],
      shipping: { governorate: "basra" },
      zoneId: "zone-basra",
    });
    expect(validateAddress(filled, { zones }).errors).toEqual(["governorate"]);
  });

  test("reports every field to fix", () => {
    expect(validateAddress(emptyAddress("12")).errors).toEqual([
      "fullName",
      "phone",
      "governorate",
      "address",
    ]);
    expect(
      validateAddress({ ...filled, governorate: "atlantis" }).errors
    ).toEqual(["governorate"]);
  });

  test("defaults to the account phone in E.164", () => {
    expect(accountPhone("9647701234567")).toBe("+9647701234567");
    expect(accountPhone("+9647701234567")).toBe("+9647701234567");
    expect(accountPhone(undefined)).toBe("");
  });

  test("names governorates in the reader's language", () => {
    expect(governorateName("basra", "ar")).toBe("البصرة");
    expect(governorateName("basra", "en")).toBe("Basra");
    expect(governorateName("unknown", "en")).toBe("unknown");
  });
});

describe("orders", () => {
  test("follow the fulfilment steps", () => {
    expect(orderProgress("pending")).toBe(0);
    expect(orderProgress("shipped")).toBe(3);
    expect(orderProgress("delivered")).toBe(4);
    expect(orderProgress("cancelled")).toBe(-1);
    expect(isActiveOrder("processing")).toBe(true);
    expect(isActiveOrder("delivered")).toBe(false);
    expect(itemCount([{ quantity: 2 }, { quantity: 1 }])).toBe(3);
  });

  test("detail pages are dynamic routes", () => {
    expect(orderPath("a b")).toBe("/pass/orders/a%20b");
  });
});

describe("error messages", () => {
  test("checkout", () => {
    expect(toCheckoutError({ message: "Cart is empty" })).toBe("cartEmpty");
    expect(toCheckoutError({ message: "Not enough stock" })).toBe("outOfStock");
    expect(
      toCheckoutError({
        message: "A product in the cart is no longer available",
      })
    ).toBe("unavailable");
    expect(toCheckoutError({ message: "Invalid shipping address" })).toBe(
      "invalidAddress"
    );
    expect(
      toCheckoutError({ code: "order_not_payable", name: "ApiError" })
    ).toBe("notPayable");
    expect(toCheckoutError({ code: "provider_error", name: "ApiError" })).toBe(
      "payment"
    );
    expect(toCheckoutError(new Error("offline"))).toBe("unknown");
  });

  test("rentals and RSVPs", () => {
    expect(toRentalError({ message: "No free rental slots" })).toBe("noSlots");
    expect(toRentalError({ message: "All copies are rented out" })).toBe(
      "unavailable"
    );
    expect(
      toRentalError({ message: "Rental not found or already delivered" })
    ).toBe("notCancellable");
    expect(toRsvpError({ message: "This event is full" })).toBe("full");
    expect(toRsvpError({ message: "This event is not open for RSVPs" })).toBe(
      "closed"
    );
  });
});

describe("The IDEA Plus", () => {
  test("rental allowance", () => {
    expect(toAllowance([{ in_use: 1, slots: 3, tier: 2 }])).toEqual({
      free: 2,
      slots: 3,
      tier: 2,
      used: 1,
    });
    expect(toAllowance([])).toEqual({ free: 0, slots: 0, tier: 0, used: 0 });
    expect(toAllowance([{ in_use: 4, slots: 2 }]).free).toBe(0);
  });
});

describe("events", () => {
  test("seats left", () => {
    expect(seatsLeft(null, 10)).toBeNull();
    expect(seatsLeft(20, undefined)).toBeNull();
    expect(seatsLeft(20, 5)).toBe(15);
    expect(seatsLeft(5, 9)).toBe(0);
  });

  test("upcoming RSVPs, soonest first", () => {
    const now = new Date("2026-11-01T00:00:00Z");
    const at = (iso: string) => ({ event: { starts_at: iso } });
    const sorted = upcomingRsvps(
      [
        at("2026-12-01T00:00:00Z"),
        at("2026-10-01T00:00:00Z"),
        { event: null },
        at("2026-11-02T00:00:00Z"),
      ],
      now
    );
    expect(sorted.map((rsvp) => rsvp.event.starts_at)).toEqual([
      "2026-11-02T00:00:00Z",
      "2026-12-01T00:00:00Z",
    ]);
  });

  test("calendar feed links", () => {
    const feed = calendarFeedUrl("https://api.theideaiq.com/", "tok");
    expect(feed).toBe("https://api.theideaiq.com/calendar/tok.ics");
    expect(webcalUrl(feed)).toBe("webcal://api.theideaiq.com/calendar/tok.ics");
  });
});

describe("submissions", () => {
  const draft = {
    body: "",
    file: null,
    format: "text" as const,
    title: "A poem",
    type: "poetry" as const,
  };
  const file = (type: string, size = 10) =>
    new File(["x".repeat(size)], "work", { type });

  test("written work needs a title and a body or a file", () => {
    expect(validateSubmission({ ...draft, title: " " })).toBe("title");
    expect(validateSubmission(draft)).toBe("body");
    expect(validateSubmission({ ...draft, body: "Lines" })).toBeNull();
    expect(validateSubmission({ ...draft, format: "file" })).toBe(
      "fileMissing"
    );
    expect(
      validateSubmission({
        ...draft,
        file: file("application/pdf"),
        format: "file",
      })
    ).toBeNull();
  });

  test("visual art requires an image", () => {
    const art = { ...draft, type: "visual_art" as const };
    expect(validateSubmission({ ...art, body: "text" })).toBe("imageRequired");
    expect(validateSubmission({ ...art, file: file("application/pdf") })).toBe(
      "imageRequired"
    );
    expect(validateSubmission({ ...art, file: file("image/png") })).toBeNull();
  });

  test("only waiting work can be withdrawn", () => {
    expect(canWithdraw("pending")).toBe(true);
    expect(canWithdraw("revisions_requested")).toBe(true);
    expect(canWithdraw("accepted")).toBe(false);
  });
});

describe("accounts", () => {
  test("onboarding is profile only; organizations are optional", () => {
    const fresh = {
      created_at: "2026-11-01T00:00:00Z",
      full_name: "Sara",
      updated_at: "2026-11-01T00:00:00Z",
    };
    expect(needsOnboarding({ ...fresh, full_name: null }, 0)).toBe(true);
    expect(needsOnboarding(fresh, 0)).toBe(true);
    expect(
      needsOnboarding({ ...fresh, updated_at: "2026-11-01T00:05:00Z" }, 0)
    ).toBe(false);
    expect(needsOnboarding(fresh, 1)).toBe(false);
  });

  test("navigation highlights the current section", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/store/product", "/")).toBe(false);
    expect(isActivePath("/store/product", "/store")).toBe(true);
    expect(isActivePath("/storefront", "/store")).toBe(false);
  });
});
