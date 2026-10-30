"use server";

import { scannedPass } from "@repo/auth/pass-code";
import { buckets, removeFiles } from "@repo/storage";
import { z } from "zod";
import {
  ActionFailure,
  affected,
  check,
  staffAction,
} from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";
import { callApi } from "@/lib/admin/api";
import { crmContactSchema, markContactedSchema } from "@/lib/admin/crm";
import {
  checkbox,
  optionalDate,
  optionalText,
  slug,
  text,
  uuid,
} from "@/lib/admin/forms";

export const saveCrmContact = staffAction(
  "customers",
  crmContactSchema,
  async ({ input, supabase, staff }) => {
    check(
      await supabase.from("crm_contacts").upsert({
        last_contacted_at: input.lastContactedAt,
        notes: input.notes,
        status: input.status,
        tags: input.tags,
        updated_by: staff.userId,
        user_id: input.userId,
      })
    );
  }
);

/** "Contacted today": stamps the CRM record with the current time. */
export const markContacted = staffAction(
  "customers",
  markContactedSchema,
  async ({ input, supabase, staff }) => {
    check(
      await supabase.from("crm_contacts").upsert({
        last_contacted_at: new Date().toISOString(),
        updated_by: staff.userId,
        user_id: input.userId,
      })
    );
  }
);

/**
 * Suspends a customer from ordering, renting, RSVPs and submissions (the
 * RPCs and policies check `banned_at`), or lifts the suspension. Staff
 * accounts are managed on the Staff page instead.
 */
export const setSuspended = staffAction(
  "customers",
  z.object({ suspend: checkbox, userId: uuid }),
  async ({ input, supabase, staff }) => {
    if (input.userId === staff.userId) {
      throw new ActionFailure("forbidden");
    }
    const { data: target } = await supabase
      .from("staff")
      .select("user_id")
      .eq("user_id", input.userId)
      .maybeSingle();
    if (target) {
      throw new ActionFailure("forbidden");
    }
    affected(
      await supabase
        .from("profiles")
        .update({ banned_at: input.suspend ? new Date().toISOString() : null })
        .eq("id", input.userId)
        .select("id")
    );
  }
);

export interface CheckedPass {
  /** Apple Wallet's fixed code rather than the 30-second one. */
  fixedCode: boolean;
  memberNumber: number | null;
  memberSince: string | null;
  name: string | null;
  userId: string | null;
  valid: boolean;
}

/**
 * Checks a The IDEA Pass card at the counter: the scanned QR code
 * (`IDEA:<member number>:<code>`), or the member number and the 6-digit
 * code typed in. `check_pass` accepts a current code, or an Apple Wallet
 * card's fixed code.
 */
export const checkPass = staffAction(
  "customers",
  z.object({
    code: z.string().trim().max(64).optional(),
    scanned: z.string().trim().max(200).optional(),
  }),
  async ({ input, supabase }) => {
    const { data } = check(
      await supabase.rpc("check_pass", {
        scanned: scannedPass(input.scanned, input.code),
      })
    );
    const row = data?.[0];
    const result: CheckedPass = {
      fixedCode: row?.card === "wallet",
      memberNumber: row?.member_number ?? null,
      memberSince: row?.member_since ?? null,
      name: row?.full_name ?? null,
      userId: row?.user_id ?? null,
      valid: row?.valid ?? false,
    };
    return success("saved", { data: { pass: result } });
  }
);

/** The most Bulbs one adjustment moves (`adjust_bulbs`), 1 IQD each. */
const MAX_ADJUSTMENT = 10_000_000;

/**
 * Adds or takes away a member's Bulbs with a reason (`adjust_bulbs`: support
 * and finance staff; audited).
 */
export const adjustBulbs = staffAction(
  "customers",
  z.object({
    bulbs: z
      .string()
      .trim()
      .regex(/^[-−]?\d{1,8}$/)
      .transform((value) => Number(value.replace("−", "-")))
      .refine((value) => value !== 0 && Math.abs(value) <= MAX_ADJUSTMENT),
    reason: z.string().trim().min(3).max(300),
    userId: uuid,
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("adjust_bulbs", {
        bulbs: input.bulbs,
        member: input.userId,
        why: input.reason,
      })
    );
    return success();
  }
);

// ── Students ─────────────────────────────────────────────────────────────

/**
 * Approves (until the end of the academic year, or an earlier date the card
 * shows) or rejects a student card, then deletes the photo: only the
 * outcome is kept.
 */
export const reviewStudentCard = staffAction(
  "customers",
  z.object({
    approve: z.enum(["true", "false"]),
    id: uuid,
    reason: optionalText(500),
    until: optionalDate,
  }),
  async ({ input, supabase }) => {
    const { data: path } = check(
      await supabase.rpc("review_student_card", {
        approve: input.approve === "true",
        reason: input.reason ?? undefined,
        target: input.id,
        until: input.until ?? undefined,
      })
    );
    if (path) {
      await removeFiles(supabase, buckets.studentCards.id, [path]);
    }
    return success();
  }
);

/**
 * A document for a partner's student verification: apps/api runs the
 * review as the staff member, emails the student, deletes the document and
 * tells the partner.
 */
export const reviewStudentDocument = staffAction(
  "customers",
  z.object({
    approve: z.enum(["true", "false"]),
    id: uuid,
    locale: z.enum(["ar", "en"]).default("en"),
    reason: optionalText(500),
  }),
  async ({ input, supabase }) => {
    const result = await callApi(
      supabase,
      `/admin/student-verifications/${input.id}/review`,
      {
        approve: input.approve === "true",
        locale: input.locale,
        reason: input.reason ?? undefined,
      }
    );
    if (!result.ok) {
      throw new ActionFailure(
        result.error === "unavailable" ? "apiUnavailable" : "unknown"
      );
    }
    return success();
  }
);

const DOMAIN_SEPARATOR = /[\s,،]+/;
const LEADING_AT = /^@/;
const DOMAIN = /^[a-z0-9.-]+\.[a-z]{2,}$/;

const universityFields = {
  domains: z
    .string()
    .trim()
    .transform((value) =>
      value
        .split(DOMAIN_SEPARATOR)
        .map((domain) => domain.trim().toLowerCase().replace(LEADING_AT, ""))
        .filter(Boolean)
    )
    .pipe(z.array(z.string().regex(DOMAIN)).max(10)),
  nameAr: text(160),
  nameEn: text(160),
};

export const addUniversity = staffAction(
  "customers",
  z.object({ ...universityFields, id: slug }),
  async ({ input, supabase }) => {
    check(
      await supabase.from("universities").insert({
        domains: input.domains,
        id: input.id,
        name_ar: input.nameAr,
        name_en: input.nameEn,
        position: 100,
      })
    );
    return success();
  }
);

export const saveUniversity = staffAction(
  "customers",
  z.object({ ...universityFields, active: checkbox, id: text(40) }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("universities")
        .update({
          active: input.active,
          domains: input.domains,
          name_ar: input.nameAr,
          name_en: input.nameEn,
        })
        .eq("id", input.id)
        .select("id")
    );
    return success();
  }
);

/** Decides a respondent's appeal: upheld, the response counts and is paid. */
export const decideSurveyAppeal = staffAction(
  "customers",
  z.object({ id: uuid, upheld: z.enum(["true", "false"]) }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("decide_survey_appeal", {
        target: input.id,
        upheld: input.upheld === "true",
      })
    );
    return success();
  }
);

export const reviewSurvey = staffAction(
  "customers",
  z.object({
    approve: z.enum(["true", "false"]),
    id: uuid,
    note: optionalText(1000),
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("review_survey", {
        approve: input.approve === "true",
        note: input.note ?? undefined,
        target: input.id,
      })
    );
    return success();
  }
);

// ── Verification ─────────────────────────────────────────────────────────

/**
 * Approves an identity check with the name on the card, or rejects it with
 * a reason; the photos are deleted either way, so only the outcome is kept.
 */
export const reviewIdentityCheck = staffAction(
  "customers",
  z.object({
    approve: z.enum(["true", "false"]),
    id: uuid,
    legalName: optionalText(120),
    reason: optionalText(500),
  }),
  async ({ input, supabase }) => {
    const { data: paths } = check(
      await supabase.rpc("review_identity_check", {
        approve: input.approve === "true",
        legal_name: input.legalName ?? undefined,
        reason: input.reason ?? undefined,
        target: input.id,
      })
    );
    if (paths?.length) {
      await removeFiles(supabase, buckets.verifications.id, paths);
    }
    return success();
  }
);

/**
 * Approves a staff card or employer letter (until a date, by default the
 * end of the academic year) or rejects it; the files are deleted either way.
 */
export const reviewEducatorCheck = staffAction(
  "customers",
  z.object({
    approve: z.enum(["true", "false"]),
    id: uuid,
    reason: optionalText(500),
    until: optionalDate,
  }),
  async ({ input, supabase }) => {
    const { data: paths } = check(
      await supabase.rpc("review_educator_check", {
        approve: input.approve === "true",
        reason: input.reason ?? undefined,
        target: input.id,
        until: input.until ?? undefined,
      })
    );
    if (paths?.length) {
      await removeFiles(supabase, buckets.verifications.id, paths);
    }
    return success();
  }
);

/** Verifies an organization from its letter (and approval), or rejects it. */
export const reviewOrganizationCheck = staffAction(
  "customers",
  z.object({
    approve: z.enum(["true", "false"]),
    id: uuid,
    reason: optionalText(500),
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("review_organization_check", {
        approve: input.approve === "true",
        org: input.id,
        reason: input.reason ?? undefined,
      })
    );
    return success();
  }
);
