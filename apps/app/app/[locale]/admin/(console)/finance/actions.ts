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

// ── Bulbs ───────────────────────────────────────────────────────────────────

const tierFields = Object.fromEntries(
  (["glow", "shine", "beam", "blaze"] as const).flatMap((tier) => [
    [`${tier}Min`, int(0, 1_000_000_000)],
    [`${tier}Rate`, decimalIn(0, 50)],
    [`${tier}FreeDelivery`, optionalInt(0, 1_000_000_000)],
  ])
);

/**
 * Bulbs rates: each tier's 12-month spend, cashback and free delivery (from
 * a subtotal; empty for none, 0 for always), the Plus bonus and the
 * category multipliers (fields named `multiplier:<category id>`).
 */
export const saveBulbRates = staffAction(
  "finance",
  z.object({ ...tierFields, plusBonus: decimalIn(0, 20) }).catchall(z.string()),
  async ({ input, supabase }) => {
    const values = input as Record<string, unknown>;
    if (Number(values.glowMin) !== 0) {
      // Glow is every member's tier.
      throw new ActionFailure("invalid");
    }
    const updates = await Promise.all(
      (["glow", "shine", "beam", "blaze"] as const).map((tier) =>
        supabase
          .from("bulb_tiers")
          .update({
            free_delivery_from: values[`${tier}FreeDelivery`] as number | null,
            min_spend: Number(values[`${tier}Min`]),
            rate: Number(values[`${tier}Rate`]),
          })
          .eq("tier", tier)
          .select("tier")
      )
    );
    for (const result of updates) {
      affected(result);
    }
    const multipliers: Record<string, number> = {};
    for (const [key, value] of Object.entries(values)) {
      if (key.startsWith("multiplier:")) {
        const parsed = decimalIn(0, 5).safeParse(value);
        if (!parsed.success) {
          throw new ActionFailure("invalid");
        }
        multipliers[key.slice("multiplier:".length)] = parsed.data;
      }
    }
    check(
      await supabase.rpc("set_bulb_rates", {
        multipliers,
        plus_bonus: Number(values.plusBonus),
      })
    );
    return success();
  }
);
