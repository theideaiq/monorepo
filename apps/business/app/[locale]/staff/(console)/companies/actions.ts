"use server";

import { z } from "zod";
import { affected, check, staffAction } from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";
import { int, optionalDate, optionalText, text, uuid } from "@/lib/admin/forms";

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
