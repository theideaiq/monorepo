"use server";

import { z } from "zod";
import { affected, check, staffAction } from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";
import { int, optionalDate, optionalText, text, uuid } from "@/lib/admin/forms";

/**
 * The IDEA Suite procurement, run as the staff member: support writes and
 * sends quotes and marks orders delivered; finance invoices them. The
 * database checks each step (migration 20261206000000_suite_procurement).
 */

export const cancelRequest = staffAction(
  "suite",
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
  "suite",
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
  "suite",
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
  "suite",
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
  "suite",
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
  "suite",
  z.object({ quoteId: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.rpc("send_quote", { quote: input.quoteId }));
    return success("sent");
  }
);

export const setOrderStatus = staffAction(
  "suite",
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
  "suite",
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
  "suite",
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
  "suite",
  z.object({ seatId: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.rpc("activate_plus_seat", { seat: input.seatId }));
    return success();
  }
);

export const declineSeat = staffAction(
  "suite",
  z.object({ seatId: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.rpc("decline_plus_seat", { seat: input.seatId }));
    return success();
  }
);

export const endSeat = staffAction(
  "suite",
  z.object({ seatId: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.rpc("end_plus_seat", { seat: input.seatId }));
    return success();
  }
);

/** Support proposes a candidate (with their CV, already uploaded) for a job. */
export const proposeCandidate = staffAction(
  "suite",
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
  "suite",
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
  "suite",
  z.object({ jobId: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.rpc("close_job_request", { job: input.jobId }));
    return success();
  }
);
