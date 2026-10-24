"use server";

import { affected, check, staffAction } from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";
import { replySchema, ticketUpdateSchema } from "@/lib/admin/support";

/**
 * A staff reply (the customer sees it and the ticket moves to pending) or
 * an internal note (staff only; the status stays). The database trigger
 * moves the status and notifies the customer.
 */
export const replyToTicket = staffAction(
  "support",
  replySchema,
  async ({ input, staff, supabase }) => {
    check(
      await supabase.from("support_messages").insert({
        author_id: staff.userId,
        body: input.body,
        internal: input.internal,
        ticket_id: input.ticketId,
      })
    );
    return success("sent");
  }
);

export const updateTicket = staffAction(
  "support",
  ticketUpdateSchema,
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("support_tickets")
        .update({
          assigned_to: input.assignedTo,
          priority: input.priority,
          status: input.status,
        })
        .eq("id", input.ticketId)
        .select("id")
    );
    return success();
  }
);
