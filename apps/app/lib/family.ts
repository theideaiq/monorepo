"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireUserId, unwrap } from "./queries";

/**
 * Family (migration `20270324000000_ux_overhaul.sql`): one household for a
 * Plus plan. The manager (the plan's holder, or a guardian) shares the
 * slots with a partner (today's Duo, `lib/duo.ts`), links teens (13–17,
 * their own Pass, today's guardian link, `lib/guardian.ts`) and adds kids
 * under 13 as profiles inside their own Pass (`family_profiles`, no
 * sign-in). A teen asks for an item (`ask_family`); the manager approves it
 * into their queue for them (`decide_family_request`).
 */

export interface FamilyProfile {
  birthday: string;
  id: string;
  name: string;
}

export interface FamilyRequest {
  created_at: string;
  id: string;
  product: {
    id: string;
    images: string[];
    name_ar: string;
    name_en: string;
    slug: string;
  } | null;
  product_id: string;
  status: string;
  teen_id: string;
}

const FAMILY = ["family"] as const;
const QUEUE = ["rental-queue"] as const;

/** Kids' profiles are for under 13s (`add_family_profile` checks it too). */
export const KID_MAX_AGE = 13;

/** Age in whole years on a day (Baghdad dates are plain `YYYY-MM-DD`). */
export const ageOn = (birthday: string, today: string) => {
  const [by, bm, bd] = birthday.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  if (!(by && bm && bd && ty && tm && td)) {
    return Number.NaN;
  }
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
};

/** Today in Baghdad, as `YYYY-MM-DD`. */
export const baghdadToday = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Baghdad",
    year: "numeric",
  }).format(now);

/** Whether a birthday makes a kid's profile (under 13, not in the future). */
export const isKidBirthday = (birthday: string, today = baghdadToday()) => {
  const age = ageOn(birthday, today);
  return Number.isFinite(age) && age >= 0 && age < KID_MAX_AGE;
};

/** The caller's kids' profiles. */
export const useFamilyProfiles = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("family_profiles")
          .select("id, name, birthday")
          .eq("manager_id", requireUserId(user?.id))
          .order("created_at")
      ) as FamilyProfile[],
    queryKey: [...FAMILY, "profiles", user?.id ?? ""],
  });
};

const REQUEST_COLUMNS =
  "id, teen_id, product_id, status, created_at, product:products (id, slug, name_ar, name_en, images)" as const;

/** Requests waiting for the caller (a guardian) to approve. */
export const useFamilyRequests = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("family_requests")
          .select(REQUEST_COLUMNS)
          .eq("manager_id", requireUserId(user?.id))
          .eq("status", "pending")
          .order("created_at")
      ) as unknown as FamilyRequest[],
    queryKey: [...FAMILY, "requests", user?.id ?? ""],
  });
};

/** A teen's own requests (newest first), to show what they asked for. */
export const useMyFamilyAsks = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("family_requests")
          .select(REQUEST_COLUMNS)
          .eq("teen_id", requireUserId(user?.id))
          .order("created_at", { ascending: false })
          .limit(20)
      ) as unknown as FamilyRequest[],
    queryKey: [...FAMILY, "asks", user?.id ?? ""],
  });
};

/** Every Family action; each refreshes the Family and the queue. */
export const useFamilyActions = () => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const onSettled = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: FAMILY }),
      queryClient.invalidateQueries({ queryKey: QUEUE }),
    ]);

  return {
    addKid: useMutation({
      mutationFn: async ({
        birthday,
        name,
      }: {
        birthday: string;
        name: string;
      }) =>
        unwrap(await supabase.rpc("add_family_profile", { birthday, name })),
      onSettled,
    }),
    ask: useMutation({
      mutationFn: async (product: string) =>
        unwrap(await supabase.rpc("ask_family", { product })),
      onSettled,
    }),
    decide: useMutation({
      mutationFn: async ({
        approve,
        request,
      }: {
        approve: boolean;
        request: string;
      }) =>
        unwrap(
          await supabase.rpc("decide_family_request", { approve, request })
        ),
      onSettled,
    }),
    queueFor: useMutation({
      mutationFn: async ({
        product,
        profile,
      }: {
        product: string;
        profile: string;
      }) =>
        unwrap(
          await supabase.rpc("queue_add_for_profile", { product, profile })
        ),
      onSettled,
    }),
    removeKid: useMutation({
      mutationFn: async (profile: string) =>
        unwrap(await supabase.rpc("remove_family_profile", { profile })),
      onSettled,
    }),
  };
};

export type FamilyError =
  | "ageRating"
  | "failed"
  | "manyKids"
  | "needsGuardian"
  | "notAdult"
  | "notInPlus"
  | "notUnder13";

/** Why a Family action was refused, as a message key. */
export const familyErrorKey = (error: Error | null): FamilyError => {
  const message = error?.message ?? "";
  const known: [string, FamilyError][] = [
    ["managed by an adult", "notAdult"],
    ["under 13s", "notUnder13"],
    ["At most 6", "manyKids"],
    ["Not for this age", "ageRating"],
    ["Not available under 18", "ageRating"],
    ["link with your Pass first", "needsGuardian"],
    ["Not in Plus", "notInPlus"],
  ];
  return known.find(([text]) => message.includes(text))?.[1] ?? "failed";
};
