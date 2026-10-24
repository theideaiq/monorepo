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
import { checkbox, optionalText, optionalUuid, text } from "@/lib/admin/forms";
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
