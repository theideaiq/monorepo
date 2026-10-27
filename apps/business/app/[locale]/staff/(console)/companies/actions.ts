"use server";

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { affected, check, staffAction } from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";
import {
  checkbox,
  int,
  lines,
  optionalDate,
  optionalText,
  optionalUuid,
  text,
  uuid,
} from "@/lib/admin/forms";

/**
 * The IDEA Business procurement, run as the staff member: support writes and
 * sends quotes and marks orders delivered; finance invoices them. The
 * database checks each step (migration 20261206000000_suite_procurement).
 */

export const cancelRequest = staffAction(
  "companies",
  z.object({ requestId: uuid }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("cancel_procurement_request", {
        request: input.requestId,
      })
    );
    return success();
  }
);

export const createQuote = staffAction(
  "companies",
  z.object({
    notes: optionalText(2000),
    requestId: uuid,
    validUntil: optionalDate,
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.from("quotes").insert({
        notes: input.notes,
        request_id: input.requestId,
        valid_until: input.validUntil,
      })
    );
    return success();
  }
);

export const deleteQuote = staffAction(
  "companies",
  z.object({ quoteId: uuid }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("quotes")
        .delete()
        .eq("id", input.quoteId)
        .select("id")
    );
    return success("deleted");
  }
);

export const addQuoteLine = staffAction(
  "companies",
  z.object({
    description: text(300),
    quantity: int(1, 100_000),
    quoteId: uuid,
    unitPrice: int(0, 1_000_000_000_000),
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.from("quote_lines").insert({
        description: input.description,
        quantity: input.quantity,
        quote_id: input.quoteId,
        unit_price: input.unitPrice,
      })
    );
    return success();
  }
);

export const removeQuoteLine = staffAction(
  "companies",
  z.object({ lineId: uuid }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("quote_lines")
        .delete()
        .eq("id", input.lineId)
        .select("id")
    );
    return success("deleted");
  }
);

export const sendQuote = staffAction(
  "companies",
  z.object({ quoteId: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.rpc("send_quote", { quote: input.quoteId }));
    return success("sent");
  }
);

export const setOrderStatus = staffAction(
  "companies",
  z.object({
    orderId: uuid,
    status: z.enum(["delivered", "cancelled"]),
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("set_purchase_order_status", {
        new_status: input.status,
        purchase_order: input.orderId,
      })
    );
    return success();
  }
);

export const issueInvoice = staffAction(
  "companies",
  z.object({ days: int(0, 120), orderId: uuid }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("issue_invoice", {
        days: input.days,
        purchase_order: input.orderId,
      })
    );
    return success();
  }
);

export const setInvoiceStatus = staffAction(
  "companies",
  z.object({ invoiceId: uuid, status: z.enum(["paid", "void"]) }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("set_invoice_status", {
        invoice: input.invoiceId,
        new_status: input.status,
      })
    );
    return success();
  }
);

/** Finance approves a company's The IDEA Plus seat (subscription and invoice). */
export const activateSeat = staffAction(
  "companies",
  z.object({ seatId: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.rpc("activate_plus_seat", { seat: input.seatId }));
    return success();
  }
);

export const declineSeat = staffAction(
  "companies",
  z.object({ seatId: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.rpc("decline_plus_seat", { seat: input.seatId }));
    return success();
  }
);

export const endSeat = staffAction(
  "companies",
  z.object({ seatId: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.rpc("end_plus_seat", { seat: input.seatId }));
    return success();
  }
);

/** Support proposes a candidate (with their CV, already uploaded) for a job. */
export const proposeCandidate = staffAction(
  "companies",
  z.object({
    cvPath: optionalText(500),
    fullName: text(120),
    headline: optionalText(200),
    jobId: uuid,
    summary: optionalText(4000),
  }),
  async ({ input, staff, supabase }) => {
    check(
      await supabase.from("candidates").insert({
        cv_path: input.cvPath,
        full_name: input.fullName,
        headline: input.headline,
        job_request_id: input.jobId,
        proposed_by: staff.userId,
        summary: input.summary,
      })
    );
    return success();
  }
);

export const withdrawCandidate = staffAction(
  "companies",
  z.object({ candidateId: uuid }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("candidates")
        .update({ status: "withdrawn" })
        .eq("id", input.candidateId)
        .select("id")
    );
    return success();
  }
);

export const closeJob = staffAction(
  "companies",
  z.object({ jobId: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.rpc("close_job_request", { job: input.jobId }));
    return success();
  }
);

// ── Partner perks ────────────────────────────────────────────────────────

const PERK_KINDS = [
  "cafe",
  "books",
  "print",
  "gaming",
  "cinema",
  "music",
  "repair",
  "courses",
  "other",
] as const;

/** Adds a perk a partner (an organization in The IDEA Business) offers. */
export const addPerk = staffAction(
  "companies",
  z.object({
    areaAr: optionalText(120),
    areaEn: optionalText(120),
    audience: z.enum(["everyone", "students", "plus"]),
    detailsAr: optionalText(1000),
    detailsEn: optionalText(1000),
    kind: z.enum(PERK_KINDS),
    organization: uuid,
    partnerName: text(120),
    titleAr: text(120),
    titleEn: text(120),
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.from("perks").insert({
        area_ar: input.areaAr ?? "",
        area_en: input.areaEn ?? "",
        audience: input.audience,
        details_ar: input.detailsAr ?? "",
        details_en: input.detailsEn ?? "",
        kind: input.kind,
        organization_id: input.organization,
        partner_name: input.partnerName,
        title_ar: input.titleAr,
        title_en: input.titleEn,
      })
    );
    return success();
  }
);

/** Offers a perk again, or stops offering it. */
export const setPerkActive = staffAction(
  "companies",
  z.object({ active: z.enum(["true", "false"]), id: uuid }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("perks")
        .update({ active: input.active === "true" })
        .eq("id", input.id)
        .select("id")
    );
    return success();
  }
);

const PASS_ANSWERS = [
  "profile",
  "email",
  "membership",
  "student",
  "student_email",
  "adult",
  "plus",
  "phone",
  "birthdate",
  "address",
  "card",
  "offline_access",
] as const;

/** A new client secret for a partner site, and its stored hash. */
const newSecret = () => {
  const secret = randomBytes(32).toString("base64url");
  return {
    hash: createHash("sha256").update(secret, "utf8").digest("hex"),
    secret,
  };
};

/**
 * Registers a partner site for Sign in with The IDEA Pass: returns its
 * client id and secret, shown once (only the secret's hash is kept).
 */
export const addPassPartner = staffAction(
  "companies",
  z.object({
    address: checkbox,
    adult: checkbox,
    birthdate: checkbox,
    card: checkbox,
    email: checkbox,
    membership: checkbox,
    name: text(80),
    offline_access: checkbox,
    organization: optionalUuid,
    phone: checkbox,
    plus: checkbox,
    profile: checkbox,
    redirectUris: lines(10, 300).pipe(z.array(z.url()).min(1)),
    student: checkbox,
    student_email: checkbox,
    website: z.url().startsWith("https://"),
  }),
  async ({ input, supabase }) => {
    const clientId = `pass_${randomBytes(12).toString("hex")}`;
    const { hash, secret } = newSecret();
    check(
      await supabase.from("pass_partners").insert({
        answers: PASS_ANSWERS.filter((answer) => input[answer]),
        client_id: clientId,
        name: input.name,
        organization_id: input.organization,
        redirect_uris: input.redirectUris,
        secret_hash: hash,
        website: input.website,
      })
    );
    return success("saved", { data: { clientId, secret } });
  }
);

/** A new client secret (the old one stops working at once). */
export const rotatePassPartnerSecret = staffAction(
  "companies",
  z.object({ id: z.string().regex(/^pass_[a-z0-9]{24}$/) }),
  async ({ input, supabase }) => {
    const { hash, secret } = newSecret();
    affected(
      await supabase
        .from("pass_partners")
        .update({ secret_hash: hash })
        .eq("client_id", input.id)
        .select("client_id")
    );
    return success("saved", { data: { clientId: input.id, secret } });
  }
);

export const setPassPartnerActive = staffAction(
  "companies",
  z.object({
    active: z.enum(["true", "false"]),
    id: z.string().regex(/^pass_[a-z0-9]{24}$/),
  }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("pass_partners")
        .update({ active: input.active === "true" })
        .eq("client_id", input.id)
        .select("client_id")
    );
    return success();
  }
);

/** What an existing partner may ask (people still choose, each time). */
export const setPassPartnerAnswers = staffAction(
  "companies",
  z.object({
    address: checkbox,
    adult: checkbox,
    birthdate: checkbox,
    card: checkbox,
    email: checkbox,
    id: z.string().regex(/^pass_[a-z0-9]{24}$/),
    membership: checkbox,
    offline_access: checkbox,
    phone: checkbox,
    plus: checkbox,
    profile: checkbox,
    student: checkbox,
    student_email: checkbox,
  }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("pass_partners")
        .update({ answers: PASS_ANSWERS.filter((answer) => input[answer]) })
        .eq("client_id", input.id)
        .select("client_id")
    );
    return success();
  }
);
