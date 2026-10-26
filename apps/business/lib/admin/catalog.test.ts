import { describe, expect, test } from "vitest";
import {
  planSchema,
  productSchema,
  tierOptions,
  withCurrentTier,
} from "./catalog";

const product = {
  condition: "new",
  kind: "rental",
  nameAr: "لعبة",
  nameEn: "Game",
  price: "50,000",
  seller: "The IDEA",
  slug: "game",
  status: "active",
  stock: "3",
};

const plan = {
  amount: "25000",
  audience: "plus",
  billingInterval: "month",
  id: "plus-gold",
  name: "Gold",
  position: "0",
  rentalSlots: "3",
  tier: "2",
};

describe("product form", () => {
  test("rental items keep their tier, verified is a checkbox", () => {
    const parsed = productSchema.parse({
      ...product,
      rentalTier: "2",
      verified: "on",
    });
    expect(parsed.rentalTier).toBe(2);
    expect(parsed.verified).toBe(true);
    expect(parsed.seller).toBe("The IDEA");
    expect(parsed.price).toBe(50_000);
  });

  test("shop products keep a tier for their copies for rent; empty means any plan", () => {
    expect(
      productSchema.parse({ ...product, kind: "sale", rentalTier: "3" })
        .rentalTier
    ).toBe(3);
    const anyPlan = productSchema.parse({ ...product, rentalTier: "" });
    expect(anyPlan.rentalTier).toBeNull();
    expect(anyPlan.verified).toBe(false);
  });

  test("seller is required and the tier is 1–10", () => {
    expect(productSchema.safeParse({ ...product, seller: " " }).success).toBe(
      false
    );
    expect(
      productSchema.safeParse({ ...product, rentalTier: "11" }).success
    ).toBe(false);
  });
});

describe("plan form", () => {
  test("Plus plans need a tier", () => {
    expect(planSchema.parse(plan).tier).toBe(2);
    const missing = planSchema.safeParse({ ...plan, tier: "" });
    expect(missing.success).toBe(false);
    expect(missing.error?.issues[0]?.path).toEqual(["tier"]);
  });

  test("business plans have no tier or slots", () => {
    const parsed = planSchema.parse({
      ...plan,
      audience: "business",
      rentalSlots: "",
      tier: "4",
    });
    expect(parsed.tier).toBeNull();
    expect(parsed.rentalSlots).toBeNull();
  });
});

describe("rental tiers", () => {
  test("one option per Plus tier, named after its plans", () => {
    expect(
      tierOptions([
        { audience: "plus", name: "Gold monthly", tier: 2 },
        { audience: "plus", name: "Silver", tier: 1 },
        { audience: "plus", name: "Gold yearly", tier: 2 },
        { audience: "business", name: "Suite", tier: 5 },
        { audience: "plus", name: "Legacy", tier: null },
      ])
    ).toEqual([
      { names: "Silver", tier: 1 },
      { names: "Gold monthly / Gold yearly", tier: 2 },
    ]);
  });

  test("keeps a product's tier that no plan has any more", () => {
    const tiers = [{ names: "Silver", tier: 1 }];
    expect(withCurrentTier(tiers, 1, "?")).toBe(tiers);
    expect(withCurrentTier(tiers, null, "?")).toBe(tiers);
    expect(withCurrentTier(tiers, 3, "?")).toEqual([
      ...tiers,
      { names: "?", tier: 3 },
    ]);
  });
});
