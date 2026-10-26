"use server";

import { Constants } from "@repo/database";
import { z } from "zod";
import {
  ActionFailure,
  affected,
  check,
  staffAction,
} from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";
import {
  financialSettingsSchema,
  journalEntrySchema,
  parseDimensions,
} from "@/lib/admin/finance";
import {
  checkbox,
  decimalIn,
  int,
  optionalInt,
  optionalText,
  optionalUuid,
  text,
} from "@/lib/admin/forms";
import { toRpcLines, validateJournalLines } from "@/lib/admin/journal";

const { Enums } = Constants.public;

const AMOUNT = /^\d{1,15}$/;

/** "1,000" → 1000; empty → 0; anything else → NaN (rejected below). */
const amount = (value: string | undefined) => {
  const clean = (value ?? "").replaceAll(",", "").trim();
  if (!clean) {
    return 0;
  }
  return AMOUNT.test(clean) ? Number(clean) : Number.NaN;
};

/** Posts a balanced journal entry (`post_journal_entry` checks it again). */
export const postJournalEntry = staffAction(
  "finance",
  journalEntrySchema,
  async ({ input, supabase }) => {
    const dimensions = input.accountId.map((_, index) =>
      parseDimensions(input.dimensions[index])
    );
    if (dimensions.some((value) => value === null)) {
      throw new ActionFailure("invalid");
    }
    const lines = input.accountId.map((accountId, index) => ({
      accountId: accountId.trim(),
      credit: amount(input.credit[index]),
      debit: amount(input.debit[index]),
      dimensions: dimensions[index] ?? {},
      memo: input.memo[index] ?? null,
    }));
    const result = validateJournalLines(lines);
    if (!result.ok) {
      throw new ActionFailure(
        result.problem === "unbalanced" || result.problem === "zeroTotal"
          ? "unbalanced"
          : "invalid"
      );
    }
    check(
      await supabase.rpc("post_journal_entry", {
        currency: input.currency,
        description: input.description,
        entry_date: input.entryDate,
        exchange_rate: input.exchangeRate,
        lines: toRpcLines(result.lines),
        reference: input.reference ?? undefined,
        scenario: input.scenario,
      })
    );
    return success("posted", {
      redirectTo:
        input.scenario === "actual"
          ? "/finance/journal"
          : `/finance/journal?scenario=${input.scenario}`,
    });
  }
);

const accountSchema = z.object({
  active: checkbox,
  category: optionalText(60),
  code: z
    .string()
    .trim()
    .regex(/^\d{3,6}$/),
  id: optionalUuid,
  name: text(120),
  type: z.enum(Enums.account_type),
});

export const saveAccount = staffAction(
  "finance",
  accountSchema,
  async ({ input, supabase }) => {
    const row = {
      active: input.active,
      category: input.category?.toLowerCase() ?? null,
      code: input.code,
      name: input.name,
      type: input.type,
    };
    if (input.id) {
      affected(
        await supabase
          .from("chart_of_accounts")
          .update(row)
          .eq("id", input.id)
          .select("id")
      );
    } else {
      check(await supabase.from("chart_of_accounts").insert(row));
    }
    return success();
  }
);

export const saveFinancialSettings = staffAction(
  "finance",
  financialSettingsSchema,
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("financial_settings")
        .update({
          base_currency: input.baseCurrency,
          corporate_tax_rate: input.corporateTaxRate,
          fiscal_year_start_month: input.fiscalYearStartMonth,
          vat_rate: input.vatRate,
        })
        .eq("id", true)
        .select("id")
    );
    return success();
  }
);

// ── Money rules ─────────────────────────────────────────────────────────────

/**
 * The money rules: the Bulbs rate for every Pass holder (Plus plans set
 * their own), the price above which items earn half, the return window,
 * the giveaway cap per order, the cash-on-delivery limit (empty for none),
 * the price check's payment fee, delivery cost and margin floor, and the
 * category multipliers (fields named `multiplier:<category id>`).
 */
export const saveMoneyRules = staffAction(
  "finance",
  z
    .object({
      bulbHalfFrom: int(1, 1_000_000_000),
      bulbRate: decimalIn(0, 50),
      cashLimit: optionalInt(1, 1_000_000_000),
      deliveryCost: int(0, 1_000_000),
      maxGiveawayRate: decimalIn(0, 100),
      minMarginRate: decimalIn(0, 100),
      paymentFeeRate: decimalIn(0, 20),
      returnDays: int(1, 60),
    })
    .catchall(z.string()),
  async ({ input, supabase }) => {
    const multipliers: Record<string, number> = {};
    for (const [key, value] of Object.entries(input)) {
      if (key.startsWith("multiplier:")) {
        const parsed = decimalIn(0, 5).safeParse(value);
        if (!parsed.success) {
          throw new ActionFailure("invalid");
        }
        multipliers[key.slice("multiplier:".length)] = parsed.data;
      }
    }
    check(
      await supabase.rpc("set_money_rules", {
        multipliers,
        rules: {
          bulb_half_from: input.bulbHalfFrom,
          bulb_rate: input.bulbRate,
          cash_limit: input.cashLimit,
          delivery_cost: input.deliveryCost,
          max_giveaway_rate: input.maxGiveawayRate,
          min_margin_rate: input.minMarginRate,
          payment_fee_rate: input.paymentFeeRate,
          return_days: input.returnDays,
        },
      })
    );
    return success();
  }
);
