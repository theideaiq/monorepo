"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { check, staffAction } from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";
import { uuid } from "@/lib/admin/forms";
import { scannedPass } from "@/lib/admin/pass-code";

/** What the counter shows for a checked The IDEA Pass. */
export interface CounterMember {
  bulbs: { available: number; pending: number; rate: number } | null;
  memberNumber: number | null;
  memberSince: string | null;
  name: string | null;
  plus: { name: string; until: string | null } | null;
  rentals: { dueAt: string | null; id: string; name: string; status: string }[];
  rsvps: {
    checkedIn: boolean;
    eventId: string;
    startsAt: string;
    title: string;
  }[];
  userId: string | null;
  valid: boolean;
}

/**
 * The counter: checks a scanned or typed The IDEA Pass (`check_pass`), then
 * loads the member's Bulbs, live Plus, open rentals and RSVPs for events
 * from 12 hours ago to the next 24 hours. Support only (the database checks).
 */
export const lookupMember = staffAction(
  "counter",
  z.object({
    code: z.string().trim().max(64).optional(),
    scanned: z.string().trim().max(200).optional(),
  }),
  async ({ input, supabase }) => {
    const locale = await getLocale();
    const { data } = check(
      await supabase.rpc("check_pass", {
        scanned: scannedPass(input.scanned, input.code),
      })
    );
    const row = data?.[0];
    const member: CounterMember = {
      bulbs: null,
      memberNumber: row?.member_number ?? null,
      memberSince: row?.member_since ?? null,
      name: row?.full_name ?? null,
      plus: null,
      rentals: [],
      rsvps: [],
      userId: row?.user_id ?? null,
      valid: row?.valid ?? false,
    };
    if (!(member.valid && member.userId)) {
      return success("saved", { data: { member } });
    }
    const { userId } = member;
    const now = Date.now();
    const [bulbs, plus, rentals, rsvps] = await Promise.all([
      supabase.rpc("member_bulbs", { member: userId }),
      supabase
        .from("subscriptions")
        .select("current_period_end, plans!inner (name, audience)")
        .eq("user_id", userId)
        .eq("plans.audience", "plus")
        .in("status", ["active", "past_due"])
        .limit(1)
        .maybeSingle(),
      supabase
        .from("rentals")
        .select("id, name_ar, name_en, status, due_at")
        .eq("user_id", userId)
        .in("status", ["requested", "active", "overdue"])
        .order("requested_at", { ascending: false })
        .limit(10),
      supabase
        .from("event_rsvps")
        .select(
          "event_id, checked_in_at, events!inner (title_ar, title_en, starts_at)"
        )
        .eq("user_id", userId)
        .gte("events.starts_at", new Date(now - 12 * 3_600_000).toISOString())
        .lte("events.starts_at", new Date(now + 24 * 3_600_000).toISOString()),
    ]);
    const summary = bulbs.data?.[0];
    member.bulbs = summary
      ? {
          available: Number(summary.available),
          pending: Number(summary.pending),
          rate: Number(summary.rate),
        }
      : null;
    member.plus = plus.data
      ? { name: plus.data.plans.name, until: plus.data.current_period_end }
      : null;
    member.rentals = (rentals.data ?? []).map((rental) => ({
      dueAt: rental.due_at,
      id: rental.id,
      name: (locale === "ar" ? rental.name_ar : rental.name_en) ?? "",
      status: rental.status,
    }));
    member.rsvps = (rsvps.data ?? []).map((rsvp) => ({
      checkedIn: Boolean(rsvp.checked_in_at),
      eventId: rsvp.event_id,
      startsAt: rsvp.events.starts_at,
      title: locale === "ar" ? rsvp.events.title_ar : rsvp.events.title_en,
    }));
    return success("saved", { data: { member } });
  }
);

/** Checks the member in at an event (10 Bulbs, once). */
export const checkInMember = staffAction(
  "counter",
  z.object({ eventId: uuid, userId: uuid }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("check_in_rsvp", {
        event: input.eventId,
        member: input.userId,
      })
    );
    return success("saved");
  }
);
