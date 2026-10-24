import { describe, expect, test } from "vitest";
import { journalTotals, toRpcLines, validateJournalLines } from "./journal";

const cash = "00000000-0000-4000-8000-000000000001";
const sales = "00000000-0000-4000-8000-000000000002";
const vat = "00000000-0000-4000-8000-000000000003";

describe("journal entries", () => {
  test("totals", () => {
    expect(
      journalTotals([
        { accountId: cash, credit: 0, debit: 1000 },
        { accountId: sales, credit: 900, debit: 0 },
      ])
    ).toEqual({ balanced: false, credit: 900, debit: 1000, difference: 100 });
  });

  test("accepts a balanced entry and drops blank rows", () => {
    const result = validateJournalLines([
      { accountId: cash, credit: 0, debit: 1100, memo: " till " },
      { accountId: sales, credit: 1000, debit: 0 },
      { accountId: vat, credit: 100, debit: 0 },
      { accountId: "", credit: 0, debit: 0 },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lines).toHaveLength(3);
      expect(toRpcLines(result.lines)[0]).toEqual({
        account_id: cash,
        credit: 0,
        debit: 1100,
        dimensions: {},
        memo: "till",
      });
    }
  });

  test("rejects unbalanced and malformed entries", () => {
    expect(
      validateJournalLines([
        { accountId: cash, credit: 0, debit: 1000 },
        { accountId: sales, credit: 999, debit: 0 },
      ])
    ).toEqual({ ok: false, problem: "unbalanced" });

    expect(
      validateJournalLines([{ accountId: cash, credit: 0, debit: 10 }])
    ).toEqual({ ok: false, problem: "tooFewLines" });

    expect(
      validateJournalLines([
        { accountId: cash, credit: 10, debit: 10 },
        { accountId: sales, credit: 0, debit: 0, memo: "x" },
      ])
    ).toEqual({ ok: false, problem: "oneSidePerLine" });

    expect(
      validateJournalLines([
        { accountId: "", credit: 0, debit: 10 },
        { accountId: sales, credit: 10, debit: 0 },
      ])
    ).toEqual({ ok: false, problem: "missingAccount" });

    expect(
      validateJournalLines([
        { accountId: cash, credit: 0, debit: -5 },
        { accountId: sales, credit: -5, debit: 0 },
      ])
    ).toEqual({ ok: false, problem: "negativeAmount" });
  });
});
