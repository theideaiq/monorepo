import { describe, expect, test } from "vitest";
import {
  bulbsToEarn,
  bulbsToSpend,
  cartTotals,
  deliveryFee,
  describeAttributes,
  discountPercent,
  governorates,
  localized,
  planName,
  showsCondition,
  toCheckoutQuote,
} from "./index";

describe("commerce helpers", () => {
  test("picks the reader's language and falls back to the other", () => {
    const row = { name_ar: "بلايستيشن", name_en: "PlayStation" };
    expect(localized(row, "name", "ar")).toBe("بلايستيشن");
    expect(localized(row, "name", "en")).toBe("PlayStation");
    expect(localized({ name_ar: "كتاب", name_en: "" }, "name", "en")).toBe(
      "كتاب"
    );
  });

  test("estimates the cart: lines and the default delivery fee", () => {
    const settings = { shippingFee: 5000 };
    expect(cartTotals([], settings)).toEqual({
      count: 0,
      shippingFee: 0,
      subtotal: 0,
      total: 0,
    });
    expect(cartTotals([{ quantity: 2, unitPrice: 20_000 }], settings)).toEqual({
      count: 2,
      shippingFee: 5000,
      subtotal: 40_000,
      total: 45_000,
    });
  });

  test("mirrors price_checkout's delivery rules", () => {
    const settings = { shippingFee: 5000 };
    const baghdad = {
      freeFrom: 150_000,
      zoneFee: 5000,
    };
    expect(deliveryFee(40_000, settings, baghdad)).toBe(5000);
    expect(deliveryFee(150_000, settings, baghdad)).toBe(0);
    expect(deliveryFee(40_000, settings, { ...baghdad, planFree: true })).toBe(
      0
    );
    expect(deliveryFee(40_000, settings, { zoneFee: 9000 })).toBe(9000);
    expect(deliveryFee(40_000, settings, { zoneFee: null })).toBe(5000);
  });

  test("reads the server's checkout quote", () => {
    expect(
      toCheckoutQuote({
        bulb_rate: 5,
        bulbs_discount: 0,
        bulbs_to_earn: 50,
        bulbs_used: 0,
        coupon_code: null,
        delivery_waived: 5000,
        discount: 7000,
        discount_source: "invite",
        free_delivery: "plan",
        free_from: 150_000,
        shipping_fee: 0,
        subtotal: 100_000,
        total: 93_000,
        zone_id: "z1",
      })
    ).toEqual({
      bulbRate: 5,
      bulbsDiscount: 0,
      bulbsToEarn: 50,
      bulbsUsed: 0,
      couponCode: null,
      deliveryWaived: 5000,
      discount: 7000,
      discountSource: "invite",
      freeDelivery: "plan",
      freeFrom: 150_000,
      shippingFee: 0,
      subtotal: 100_000,
      total: 93_000,
      zoneId: "z1",
    });
    expect(
      toCheckoutQuote({ coupon_code: "EID10", discount_source: "coupon" })
    ).toMatchObject({ couponCode: "EID10", discountSource: "coupon" });
    expect(toCheckoutQuote(null)).toMatchObject({
      couponCode: null,
      discountSource: null,
      freeDelivery: null,
      freeFrom: null,
      total: 0,
      zoneId: null,
    });
  });

  test("computes discounts and attribute labels", () => {
    expect(discountPercent(120_000, 180_000)).toBe(33);
    expect(discountPercent(120_000, null)).toBe(0);
    expect(describeAttributes({ Color: "Black", Storage: "1 TB" })).toBe(
      "Color: Black · Storage: 1 TB"
    );
  });

  test("lists all 19 governorates with unique ids", () => {
    expect(new Set(governorates.map((g) => g.id)).size).toBe(19);
  });

  test("shows the condition of items for sale that aren't new", () => {
    expect(showsCondition({ condition: "new", kind: "sale" })).toBe(false);
    expect(showsCondition({ condition: "used", kind: "rental" })).toBe(false);
    expect(showsCondition({ condition: "open_box", kind: "sale" })).toBe(true);
    expect(showsCondition({ condition: "used", kind: "sale" })).toBe(true);
  });
});

describe("planName", () => {
  const plan = { name: "Plus Extra", name_ar: "بلس إكسترا" };

  test("Arabic pages show the Arabic name", () => {
    expect(planName(plan, "ar")).toBe("بلس إكسترا");
    expect(planName(plan, "en")).toBe("Plus Extra");
  });

  test("falls back to the English name", () => {
    expect(planName({ name: "Plus Extra", name_ar: null }, "ar")).toBe(
      "Plus Extra"
    );
    expect(planName({ name: "Plus Extra" }, "ar")).toBe("Plus Extra");
  });

  test("earns whole Bulbs at the rate", () => {
    expect(bulbsToEarn(9750, 2)).toBe(195);
    expect(bulbsToEarn(14_750, 3)).toBe(443);
    expect(bulbsToEarn(0, 5)).toBe(0);
  });

  test("spends Bulbs in steps of 250, from 1,000", () => {
    expect(bulbsToSpend(20_100, 105_000)).toBe(20_000);
    expect(bulbsToSpend(50_000, 8000)).toBe(8000);
    expect(bulbsToSpend(900, 105_000)).toBe(0);
    expect(bulbsToSpend(5000, 999)).toBe(0);
  });
});
