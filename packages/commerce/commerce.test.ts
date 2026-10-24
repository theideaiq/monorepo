import { describe, expect, test } from "vitest";
import {
  cartTotals,
  customerCondition,
  deliveryFee,
  describeAttributes,
  discountPercent,
  governorates,
  localized,
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
      count: 0,
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
    expect(showsConditionBulb({ condition: "new", kind: "rental" })).toBe(true);
    expect(showsConditionBulb({ condition: "used", kind: "sale" })).toBe(true);
  });
});
