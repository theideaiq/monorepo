import { describe, expect, test } from "vitest";
import {
  cartTotals,
  customerCondition,
  deliveryFee,
  describeAttributes,
  discountPercent,
  governorates,
  localized,
  orderDiscount,
  planName,
  showsConditionBulb,
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

  test("mirrors create_order's delivery fee", () => {
    const settings = { freeShippingThreshold: 100_000, shippingFee: 5000 };
    expect(cartTotals([], settings)).toEqual({
      bulbsDiscount: 0,
      bulbsUsed: 0,
      count: 0,
      discount: 0,
      discountSource: null,
      shippingFee: 0,
      subtotal: 0,
      total: 0,
    });
    expect(
      cartTotals([{ quantity: 2, unitPrice: 20_000 }], settings)
    ).toMatchObject({ count: 2, shippingFee: 5000, total: 45_000 });
    expect(
      cartTotals([{ quantity: 1, unitPrice: 100_000 }], settings)
    ).toMatchObject({ shippingFee: 0, total: 100_000 });
  });

  test("delivers free for the member's tier", () => {
    const settings = { freeShippingThreshold: null, shippingFee: 5000 };
    const lines = [{ quantity: 1, unitPrice: 40_000 }];
    const delivery = { fulfilment: "delivery" as const, zoneFee: 5000 };
    expect(
      cartTotals(lines, settings, { ...delivery, freeDeliveryFrom: 50_000 })
    ).toMatchObject({ shippingFee: 5000 });
    expect(
      cartTotals(lines, settings, { ...delivery, freeDeliveryFrom: 0 })
    ).toMatchObject({ shippingFee: 0, total: 40_000 });
  });

  test("takes 100 IQD off per Bulb, never more than the order", () => {
    const settings = { freeShippingThreshold: null, shippingFee: 5000 };
    const lines = [{ quantity: 1, unitPrice: 3000 }];
    const delivery = { fulfilment: "delivery" as const, zoneFee: 5000 };
    expect(cartTotals(lines, settings, delivery, 30)).toMatchObject({
      bulbsDiscount: 3000,
      bulbsUsed: 30,
      total: 5000,
    });
    expect(cartTotals(lines, settings, delivery, 500)).toMatchObject({
      bulbsUsed: 80,
      total: 0,
    });
  });

  test("takes a friend's invite off the first order, capped", () => {
    const settings = { freeShippingThreshold: null, shippingFee: 5000 };
    const delivery = { fulfilment: "delivery" as const, zoneFee: 5000 };
    expect(
      cartTotals([{ quantity: 1, unitPrice: 50_000 }], settings, delivery, 0, {
        invited: true,
      })
    ).toMatchObject({ discount: 5000, total: 50_000 });
    expect(
      cartTotals([{ quantity: 1, unitPrice: 400_000 }], settings, delivery, 0, {
        invited: true,
      })
    ).toMatchObject({ discount: 15_000, total: 390_000 });
  });

  test("takes the larger of an invite and an affiliate's 5%", () => {
    const settings = { freeShippingThreshold: null, shippingFee: 0 };
    const lines = (unitPrice: number) => [{ quantity: 1, unitPrice }];
    expect(
      cartTotals(lines(100_000), settings, undefined, 0, { affiliate: true })
    ).toMatchObject({ discount: 5000, discountSource: "affiliate" });
    expect(
      cartTotals(lines(100_000), settings, undefined, 0, {
        affiliate: true,
        invited: true,
      })
    ).toMatchObject({ discount: 10_000, discountSource: "invite" });
    expect(
      cartTotals(lines(400_000), settings, undefined, 0, {
        affiliate: true,
        invited: true,
      })
    ).toMatchObject({ discount: 20_000, discountSource: "affiliate" });
    expect(orderDiscount(100_000)).toEqual({
      discount: 0,
      discountSource: null,
    });
  });

  test("prices delivery by zone and makes pickup free", () => {
    const settings = { freeShippingThreshold: 100_000, shippingFee: 5000 };
    const lines = [{ quantity: 1, unitPrice: 40_000 }];
    expect(
      cartTotals(lines, settings, { fulfilment: "delivery", zoneFee: 9000 })
    ).toMatchObject({ shippingFee: 9000, total: 49_000 });
    expect(
      cartTotals(lines, settings, { fulfilment: "delivery", zoneFee: null })
    ).toMatchObject({ shippingFee: 5000 });
    expect(
      cartTotals(lines, settings, { fulfilment: "pickup", zoneFee: 9000 })
    ).toMatchObject({ shippingFee: 0, total: 40_000 });
    expect(
      deliveryFee(100_000, settings, { fulfilment: "delivery", zoneFee: 9000 })
    ).toBe(0);
    expect(
      deliveryFee(
        100_000,
        { freeShippingThreshold: null, shippingFee: 5000 },
        { fulfilment: "delivery", zoneFee: 9000 }
      )
    ).toBe(9000);
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

  test("maps stored conditions to the three condition bulbs", () => {
    expect(customerCondition("new")).toBe("new");
    expect(customerCondition("open_box")).toBe("like-new");
    expect(customerCondition("refurbished")).toBe("like-new");
    expect(customerCondition("used")).toBe("used");
    expect(showsConditionBulb({ condition: "new", kind: "sale" })).toBe(false);
    expect(showsConditionBulb({ condition: "new", kind: "rental" })).toBe(
      false
    );
    expect(showsConditionBulb({ condition: "used", kind: "rental" })).toBe(
      false
    );
    expect(showsConditionBulb({ condition: "used", kind: "sale" })).toBe(true);
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
});
