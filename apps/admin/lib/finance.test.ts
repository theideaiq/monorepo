import { describe, expect, test } from "vitest";
import {
  assetState,
  financialSettingsSchema,
  fiscalYearStart,
  fixedAssetSchema,
  journalEntrySchema,
  parseDimensions,
  scenarioFrom,
  scheduleTotals,
} from "./finance";

describe("scenarios", () => {
  test("the actual books unless another scenario is chosen", () => {
    expect(scenarioFrom({})).toBe("actual");
    expect(scenarioFrom({ scenario: "budget" })).toBe("budget");
    expect(scenarioFrom({ scenario: ["forecast", "budget"] })).toBe(
      "forecast"
    );
    expect(scenarioFrom({ scenario: "dream" })).toBe("actual");
  });
});

const entry = {
  accountId: ["a", "b"],
  credit: ["", "1000"],
  debit: ["1000", ""],
  description: "Sale",
  entryDate: "2026-11-04",
};

describe("journal entry header", () => {
  test("IQD by default, with a rate of 1", () => {
    const parsed = journalEntrySchema.parse({ ...entry, exchangeRate: "5" });
    expect(parsed.currency).toBe("IQD");
    expect(parsed.exchangeRate).toBe(1);
    expect(parsed.scenario).toBe("actual");
    expect(parsed.dimensions).toEqual([]);
  });

  test("another currency needs a positive rate", () => {
    const parsed = journalEntrySchema.parse({
      ...entry,
      currency: "usd",
      exchangeRate: "1,310.5",
      scenario: "forecast",
    });
    expect(parsed.currency).toBe("USD");
    expect(parsed.exchangeRate).toBe(1310.5);
    expect(parsed.scenario).toBe("forecast");

    const missing = journalEntrySchema.safeParse({ ...entry, currency: "USD" });
    expect(missing.success).toBe(false);
    expect(missing.error?.issues[0]?.path).toEqual(["exchangeRate"]);
    expect(
      journalEntrySchema.safeParse({
        ...entry,
        currency: "USD",
        exchangeRate: "0",
      }).success
    ).toBe(false);
    expect(
      journalEntrySchema.safeParse({ ...entry, currency: "dollars" }).success
    ).toBe(false);
    expect(
      journalEntrySchema.safeParse({ ...entry, scenario: "plan" }).success
    ).toBe(false);
  });
});

describe("line dimensions", () => {
  test("text pairs, blanks dropped", () => {
    expect(parseDimensions(undefined)).toEqual({});
    expect(parseDimensions("{}")).toEqual({});
    expect(
      parseDimensions('{" product_line ":"plus","branch":" ","x":"y"}')
    ).toEqual({ product_line: "plus", x: "y" });
  });

  test("anything else is rejected", () => {
    expect(parseDimensions("not json")).toBeNull();
    expect(parseDimensions("[1]")).toBeNull();
    expect(parseDimensions('{"n": 1}')).toBeNull();
    expect(parseDimensions(`{"k":"${"v".repeat(121)}"}`)).toBeNull();
    const many = Object.fromEntries(
      Array.from({ length: 11 }, (_, index) => [`k${index}`, "v"])
    );
    expect(parseDimensions(JSON.stringify(many))).toBeNull();
  });
});

describe("fiscal year", () => {
  test("starts in the configured month", () => {
    expect(fiscalYearStart("2026-11-01", 1)).toBe("2026-01-01");
    expect(fiscalYearStart("2026-11-01", 7)).toBe("2026-07-01");
    expect(fiscalYearStart("2026-03-01", 7)).toBe("2025-07-01");
    expect(fiscalYearStart("2026-07-01", 7)).toBe("2026-07-01");
    expect(fiscalYearStart("2026-01-15", 12)).toBe("2025-12-01");
  });

  test("settings form", () => {
    expect(
      financialSettingsSchema.parse({
        baseCurrency: "iqd",
        corporateTaxRate: "15",
        fiscalYearStartMonth: "7",
        vatRate: "0",
      })
    ).toEqual({
      baseCurrency: "IQD",
      corporateTaxRate: 15,
      fiscalYearStartMonth: 7,
      vatRate: 0,
    });
    expect(
      financialSettingsSchema.safeParse({
        baseCurrency: "IQD",
        corporateTaxRate: "101",
        fiscalYearStartMonth: "13",
        vatRate: "",
      }).error?.issues.map((issue) => issue.path[0])
    ).toEqual(["corporateTaxRate", "fiscalYearStartMonth", "vatRate"]);
  });
});

describe("fixed assets", () => {
  const asset = {
    cost: "1,200,000",
    name: "Laptop",
    purchaseDate: "2026-01-10",
    salvageValue: "0",
    usefulLifeMonths: "24",
  };

  test("form", () => {
    expect(fixedAssetSchema.parse(asset)).toMatchObject({
      cost: 1_200_000,
      disposedOn: null,
      usefulLifeMonths: 24,
    });
    expect(
      fixedAssetSchema.safeParse({ ...asset, salvageValue: "2000000" }).success
    ).toBe(false);
    expect(
      fixedAssetSchema.safeParse({ ...asset, disposedOn: "2025-12-31" }).success
    ).toBe(false);
    expect(
      fixedAssetSchema.safeParse({ ...asset, usefulLifeMonths: "0" }).success
    ).toBe(false);
  });

  const rows = [
    {
      accumulated_depreciation: 500_000,
      book_value: 700_000,
      cost: 1_200_000,
      disposed_on: null,
      id: "laptop",
      monthly_depreciation: 50_000,
      months_elapsed: 10,
    },
    {
      accumulated_depreciation: 300_000,
      book_value: 0,
      cost: 300_000,
      disposed_on: null,
      id: "phone",
      monthly_depreciation: 25_000,
      months_elapsed: 12,
    },
    {
      accumulated_depreciation: 100_000,
      book_value: 500_000,
      cost: 600_000,
      disposed_on: "2026-05-01",
      id: "desk",
      monthly_depreciation: 20_000,
      months_elapsed: 5,
    },
  ];
  const life = new Map([
    ["laptop", 24],
    ["phone", 12],
    ["desk", 30],
  ]);

  test("state", () => {
    expect(assetState(rows[0] as (typeof rows)[0], 24, "2026-11-10")).toBe(
      "depreciating"
    );
    expect(assetState(rows[1] as (typeof rows)[0], 12, "2026-11-10")).toBe(
      "fullyDepreciated"
    );
    expect(assetState(rows[2] as (typeof rows)[0], 30, "2026-11-10")).toBe(
      "disposed"
    );
    // Disposal in the future doesn't count yet.
    expect(assetState(rows[2] as (typeof rows)[0], 30, "2026-04-30")).toBe(
      "depreciating"
    );
  });

  test("totals: monthly charge for depreciating assets, no book value once disposed", () => {
    expect(scheduleTotals(rows, life, "2026-11-10")).toEqual({
      accumulated: 900_000,
      bookValue: 700_000,
      cost: 2_100_000,
      monthly: 50_000,
    });
  });
});
