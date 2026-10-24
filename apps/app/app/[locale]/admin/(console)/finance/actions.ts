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
import { holderSchema } from "@/lib/admin/equity";
import {
  deleteByIdSchema,
  financialSettingsSchema,
  fixedAssetSchema,
  journalEntrySchema,
  parseDimensions,
} from "@/lib/admin/finance";
import {
  checkbox,
  int,
  optionalDate,
  optionalDecimal,
  optionalText,
  optionalUuid,
  text,
  uuid,
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

const positionSchema = z.object({
  annualIncrease: optionalDecimal(0).pipe(z.number().max(100).nullable()),
  department: text(120),
  id: optionalUuid,
  monthlySalary: int(0),
  roleTitle: text(120),
  startDate: optionalDate,
  status: z.enum(Enums.staff_plan_status),
});

export const savePosition = staffAction(
  "finance",
  positionSchema,
  async ({ input, supabase }) => {
    const row = {
      annual_increase_pct: input.annualIncrease ?? 0,
      department: input.department,
      monthly_salary: input.monthlySalary,
      role_title: input.roleTitle,
      start_date: input.startDate,
      status: input.status,
    };
    if (input.id) {
      affected(
        await supabase
          .from("staff_plan")
          .update(row)
          .eq("id", input.id)
          .select("id")
      );
    } else {
      check(await supabase.from("staff_plan").insert(row));
    }
    return success();
  }
);

export const deletePosition = staffAction(
  "finance",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.from("staff_plan").delete().eq("id", input.id));
    return success("deleted");
  }
);

const roundSchema = z.object({
  closedOn: optionalDate,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/),
  id: optionalUuid,
  name: text(120),
  pricePerShare: optionalDecimal(0),
  valuationCap: optionalDecimal(0),
});

export const saveRound = staffAction(
  "finance",
  roundSchema,
  async ({ input, supabase }) => {
    const row = {
      closed_on: input.closedOn,
      currency: input.currency,
      name: input.name,
      price_per_share: input.pricePerShare,
      valuation_cap: input.valuationCap,
    };
    if (input.id) {
      affected(
        await supabase
          .from("equity_rounds")
          .update(row)
          .eq("id", input.id)
          .select("id")
      );
    } else {
      check(await supabase.from("equity_rounds").insert(row));
    }
    return success();
  }
);

export const deleteRound = staffAction(
  "finance",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.from("equity_rounds").delete().eq("id", input.id));
    return success("deleted");
  }
);

export const saveHolder = staffAction(
  "finance",
  holderSchema,
  async ({ input, supabase }) => {
    const row = {
      conversion_cap: input.conversionCap,
      discount_rate: input.discountRate,
      instrument: input.instrument,
      invested_amount: input.investedAmount,
      name: input.name,
      round_id: input.roundId,
      shares: input.shares,
      type: input.type,
      vesting_start: input.vestingStart,
    };
    if (input.id) {
      affected(
        await supabase
          .from("equity_holders")
          .update(row)
          .eq("id", input.id)
          .select("id")
      );
    } else {
      check(await supabase.from("equity_holders").insert(row));
    }
    return success();
  }
);

export const deleteHolder = staffAction(
  "finance",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.from("equity_holders").delete().eq("id", input.id));
    return success("deleted");
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

export const saveFixedAsset = staffAction(
  "finance",
  fixedAssetSchema,
  async ({ input, supabase }) => {
    const row = {
      category: input.category,
      cost: input.cost,
      disposed_on: input.disposedOn,
      name: input.name,
      notes: input.notes,
      purchase_date: input.purchaseDate,
      salvage_value: input.salvageValue,
      useful_life_months: input.usefulLifeMonths,
    };
    if (input.id) {
      affected(
        await supabase
          .from("fixed_assets")
          .update(row)
          .eq("id", input.id)
          .select("id")
      );
    } else {
      check(await supabase.from("fixed_assets").insert(row));
    }
    return success();
  }
);

export const deleteFixedAsset = staffAction(
  "finance",
  deleteByIdSchema,
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("fixed_assets")
        .delete()
        .eq("id", input.id)
        .select("id")
    );
    return success("deleted");
  }
);
