"use server";

import { z } from "zod";
import { affected, check, staffAction } from "@/lib/admin/action";
import { fromBaghdadInput } from "@/lib/admin/dates";
import {
  checkbox,
  date,
  int,
  optionalText,
  text,
  uuid,
} from "@/lib/admin/forms";

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

// ── The IDEA Plus: swaps, waitlist, areas, settings ────────────────────────

/** A swap is done: what went back is returned, what came is with the member. */
export const completeSwap = staffAction(
  "rentals",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.rpc("complete_swap", { target: input.id }));
  }
);

/** Cancels a booked swap: held copies go back to stock. */
export const cancelSwap = staffAction(
  "rentals",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.rpc("cancel_swap", { target: input.id }));
  }
);

/** Invites someone from the waitlist now, whatever their place. */
export const inviteToPlus = staffAction(
  "rentals",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.rpc("invite_to_plus", { member: input.id }));
  }
);

/** Places, how long invites stay open and the extra home swap fee. */
export const savePlusSettings = staffAction(
  "rentals",
  z.object({
    capacity: int(0, 100_000),
    inviteHours: int(1, 720),
    swapFee: int(0, 1_000_000),
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("set_plus_settings", {
        capacity: input.capacity,
        invite_hours: input.inviteHours,
        swap_fee: input.swapFee,
      })
    );
  }
);

const areaFields = {
  active: checkbox,
  nameAr: text(80),
  nameEn: text(80),
  weekday: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .pipe(z.union([z.null(), z.number().int().min(0).max(6)])),
};

/** Adds a Plus area (a part of Baghdad with its delivery day). */
export const addPlusArea = staffAction(
  "rentals",
  z.object(areaFields),
  async ({ input, supabase }) => {
    check(
      await supabase.from("plus_areas").insert({
        active: input.active,
        name_ar: input.nameAr,
        name_en: input.nameEn,
        position: 100,
        weekday: input.weekday,
      })
    );
  }
);

/** Renames an area, changes its delivery day or switches it off. */
export const updatePlusArea = staffAction(
  "rentals",
  z.object({ ...areaFields, id: uuid }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("plus_areas")
        .update({
          active: input.active,
          name_ar: input.nameAr,
          name_en: input.nameEn,
          weekday: input.weekday,
        })
        .eq("id", input.id)
        .select("id")
    );
  }
);
