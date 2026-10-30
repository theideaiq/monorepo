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
import { callApi } from "@/lib/admin/api";
import {
  financialSettingsSchema,
  journalEntrySchema,
  parseDimensions,
} from "@/lib/admin/finance";
import {
  checkbox,
  date,
  decimalIn,
  int,
  optionalDateTime,
  optionalInt,
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
 * their own), the return window, the giveaway cap per order, the
 * cash-on-delivery limit (empty for none), and the price check's payment
 * fee, delivery cost and margin floor.
 */
export const saveMoneyRules = staffAction(
  "finance",
  z.object({
    bulbRate: decimalIn(0, 50),
    cashLimit: optionalInt(1, 1_000_000_000),
    deliveryCost: int(0, 1_000_000),
    maxGiveawayRate: decimalIn(0, 100),
    minMarginRate: decimalIn(0, 100),
    paymentFeeRate: decimalIn(0, 20),
    returnDays: int(1, 60),
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("set_money_rules", {
        rules: {
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

// ── Seller payouts ──────────────────────────────────────────────────────────

/** Prepares this week's batch: a pending payout per shop owed money. */
export const preparePayouts = staffAction(
  "finance",
  z.object({ periodEnd: date }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("prepare_payouts", { period_end: input.periodEnd })
    );
    return success();
  }
);

/** A payout sent by bank, ZainCash or Qi, with the transfer's reference. */
export const markPayoutPaid = staffAction(
  "finance",
  z.object({
    id: uuid,
    method: z.enum(["bank", "zaincash", "qi"]),
    reference: text(200),
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("mark_payout_paid", {
        method: input.method,
        reference: input.reference,
        target: input.id,
      })
    );
    return success();
  }
);

/** A payout prepared by mistake: its lines wait for the next batch. */
export const cancelPayout = staffAction(
  "finance",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.rpc("cancel_payout", { target: input.id }));
    return success();
  }
);

const COUPON_CODE = /^[A-Z0-9]{4,20}$/;

/**
 * A coupon code The IDEA pays for: a share (at most 20%) or an amount off,
 * within the giveaway cap. Codes are stored without case or spaces.
 */
export const createCoupon = staffAction(
  "finance",
  z
    .object({
      amount: int(1),
      code: z
        .string()
        .transform((value) => value.replaceAll(/\s/g, "").toUpperCase())
        .pipe(z.string().regex(COUPON_CODE)),
      description: optionalText(300),
      endsAt: optionalDateTime,
      kind: z.enum(Enums.coupon_kind),
      maxDiscount: optionalInt(1),
      maxUses: optionalInt(1),
      minSubtotal: optionalInt(0),
      startsAt: optionalDateTime,
      usesPerMember: int(1, 1000),
    })
    .refine((input) => input.kind !== "percent" || input.amount <= 20, {
      path: ["amount"],
    })
    .refine(
      (input) =>
        !(input.startsAt && input.endsAt) || input.endsAt > input.startsAt,
      { path: ["endsAt"] }
    ),
  async ({ input, staff, supabase }) => {
    check(
      await supabase.from("coupons").insert({
        amount: input.amount,
        code: input.code,
        created_by: staff.userId,
        description: input.description,
        ends_at: input.endsAt,
        kind: input.kind,
        max_discount: input.maxDiscount,
        max_uses: input.maxUses,
        min_subtotal: input.minSubtotal ?? 0,
        uses_per_member: input.usesPerMember,
        ...(input.startsAt ? { starts_at: input.startsAt } : {}),
      })
    );
    return success("saved");
  }
);

/** Turns a code on or off; codes are never deleted, orders refer to them. */
export const setCouponActive = staffAction(
  "finance",
  z.object({ active: z.enum(["true", "false"]), id: uuid }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("coupons")
        .update({ active: input.active === "true" })
        .eq("id", input.id)
        .select("id")
    );
    return success();
  }
);

/** Finance records a program refund it paid (Wayl or cash). */
export const markProgramRefunded = staffAction(
  "finance",
  z.object({ id: uuid, reference: optionalText(200) }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("mark_program_refunded", {
        application: input.id,
        reference: input.reference ?? undefined,
      })
    );
    return success("saved");
  }
);

/** A denomination's own margin (empty for the store's) and whether it's on sale. */
export const setDigitalProduct = staffAction(
  "finance",
  z.object({
    active: checkbox,
    id: uuid,
    margin: z
      .string()
      .trim()
      .transform((value) => (value === "" ? null : Number(value)))
      .pipe(z.number().min(0).max(100).nullable()),
  }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("digital_products")
        .update({ active: input.active, margin_rate: input.margin })
        .eq("id", input.id)
        .select("id")
    );
    return success("saved");
  }
);

/** Buys the codes waiting now (apps/api holds the supplier's keys). */
const buyCodesNow = async (supabase: Parameters<typeof callApi>[0]) => {
  const result = await callApi(supabase, "/admin/digital-codes", {});
  if (!result.ok) {
    throw new ActionFailure(
      result.error === "unavailable" ? "apiUnavailable" : "unknown"
    );
  }
};

/** Lets a held order's codes be bought, and buys them now. */
export const releaseDigitalCodes = staffAction(
  "finance",
  z.object({ order: uuid }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("release_digital_codes", { target_order: input.order })
    );
    await buyCodesNow(supabase);
    return success("saved");
  }
);

/** Tries a failed code again, now. */
export const retryDigitalCode = staffAction(
  "finance",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.rpc("retry_digital_code", { target: input.id }));
    await buyCodesNow(supabase);
    return success("saved");
  }
);

/** A brand's Arabic names and whether it's on sale. */
export const setDigitalBrand = staffAction(
  "finance",
  z.object({
    active: checkbox,
    id: uuid,
    nameAr: text(120),
    regionAr: text(60),
  }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("digital_brands")
        .update({
          active: input.active,
          name_ar: input.nameAr,
          region_ar: input.regionAr,
        })
        .eq("id", input.id)
        .select("id")
    );
    return success("saved");
  }
);

/** Reads the supplier's catalog into brands and denominations (apps/api). */
export const syncDigitalCatalog = staffAction(
  "finance",
  z.object({}),
  async ({ supabase }) => {
    const result = await callApi(supabase, "/admin/digital-codes/sync", {});
    if (!result.ok) {
      throw new ActionFailure(
        result.error === "unavailable" ? "apiUnavailable" : "unknown"
      );
    }
    return success("saved");
  }
);
