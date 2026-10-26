"use server";

import { z } from "zod";
import { affected, check, staffAction } from "@/lib/admin/action";
import { fromBaghdadInput } from "@/lib/admin/dates";
import { date, int, optionalText, uuid } from "@/lib/admin/forms";

/** A due date (YYYY-MM-DD) as the end of that day in Baghdad. */
const dueAt = (day: string) => fromBaghdadInput(`${day}T23:59`) as string;

/**
 * Hands a requested item to the member. The status trigger sets the start
 * date; the copy already left stock when it was requested.
 */
export const deliverRental = staffAction(
  "rentals",
  z.object({ due: date, id: uuid, note: optionalText(2000) }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("rentals")
        .update({
          due_at: dueAt(input.due),
          staff_note: input.note,
          status: "active",
        })
        .eq("id", input.id)
        .eq("status", "requested")
        .select("id")
    );
  }
);

/** Cancels a request that wasn't delivered; the copy goes back to stock. */
export const cancelRentalRequest = staffAction(
  "rentals",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("rentals")
        .update({ status: "cancelled" })
        .eq("id", input.id)
        .eq("status", "requested")
        .select("id")
    );
  }
);

/** The member returned the item; the copy goes back to stock. */
export const returnRental = staffAction(
  "rentals",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("rentals")
        .update({ status: "returned" })
        .eq("id", input.id)
        .in("status", ["active", "overdue"])
        .select("id")
    );
  }
);

/** Moves the due date; an overdue rental with a new future date is active again. */
export const changeDueDate = staffAction(
  "rentals",
  z.object({ due: date, id: uuid }),
  async ({ input, supabase }) => {
    const due = dueAt(input.due);
    const { data } = await supabase
      .from("rentals")
      .select("status")
      .eq("id", input.id)
      .maybeSingle();
    const reopen = data?.status === "overdue" && new Date(due) > new Date();
    affected(
      await supabase
        .from("rentals")
        .update(reopen ? { due_at: due, status: "active" } : { due_at: due })
        .eq("id", input.id)
        .in("status", ["active", "overdue"])
        .select("id")
    );
  }
);

/**
 * Settles a single-item rent once it's back: late fees and any damage come
 * out of the deposit (or, 14 days late and not back, it's kept at its used
 * price). The refund itself is paid outside the app.
 */
export const settleRental = staffAction(
  "rentals",
  z.object({ damage: int(0, 100_000_000), id: uuid }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("settle_rental", {
        damage: input.damage,
        target: input.id,
      })
    );
  }
);
