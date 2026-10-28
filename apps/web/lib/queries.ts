"use client";

import { listMemberships } from "@repo/auth/organizations";
import { useAuth } from "@repo/auth/provider";
import { useQuery } from "@tanstack/react-query";

/**
 * Data hooks. Every query runs with the signed-in user's session, so Row
 * Level Security decides what comes back; keys include the user and
 * organization so switching either refetches.
 */

export const queryKeys = {
  bulbEntries: (userId: string) => ["bulbs", userId, "entries"] as const,
  bulbRules: ["bulb-rules"] as const,
  bulbs: (userId: string) => ["bulbs", userId] as const,
  calendarToken: (userId: string) => ["calendar-token", userId] as const,
  cart: (userId: string) => ["cart", userId] as const,
  categories: (kind: string) => ["categories", kind] as const,
  deliveryZones: ["delivery-zones"] as const,
  events: ["events"] as const,
  invitations: (userId: string) => ["invitations", userId] as const,
  invites: (userId: string) => ["invites", userId] as const,
  memberships: (userId: string) => ["memberships", userId] as const,
  myReview: (productId: string, userId: string) =>
    ["reviews", "mine", productId, userId] as const,
  myRsvps: (userId: string) => ["rsvps", userId] as const,
  notifications: (userId: string) => ["notifications", userId] as const,
  order: (orderId: string) => ["orders", "detail", orderId] as const,
  orderPayments: (orderId: string) => ["order-payments", orderId] as const,
  orders: (userId: string) => ["orders", "list", userId] as const,
  organizationInvitations: (organizationId: string) =>
    ["organization-invitations", organizationId] as const,
  organizationMembers: (organizationId: string) =>
    ["organization-members", organizationId] as const,
  payments: (organizationId: string) => ["payments", organizationId] as const,
  plans: (audience: string) => ["plans", audience] as const,
  plusPayments: (userId: string) => ["plus-payments", userId] as const,
  plusSubscription: (userId: string) => ["plus-subscription", userId] as const,
  product: (slug: string) => ["product", slug] as const,
  productRatings: (productIds: readonly string[]) =>
    ["product-ratings", [...productIds].sort().join(",")] as const,
  products: (filters: object) => ["products", filters] as const,
  profile: (userId: string) => ["profile", userId] as const,
  projects: (organizationId: string) => ["projects", organizationId] as const,
  referral: (userId: string) => ["referral", userId] as const,
  rentalAllowance: (userId: string) => ["rental-allowance", userId] as const,
  rentals: (userId: string) => ["rentals", userId] as const,
  rentalTiers: (productIds: readonly string[]) =>
    ["rental-tiers", [...productIds].sort().join(",")] as const,
  reviews: (productId: string) => ["reviews", "list", productId] as const,
  rsvpCount: (eventId: string) => ["rsvp-count", eventId] as const,
  storeSettings: ["store-settings"] as const,
  submissions: (userId: string) => ["submissions", userId] as const,
  subscription: (organizationId: string) =>
    ["subscription", organizationId] as const,
  telegram: (userId: string) => ["telegram", userId] as const,
  ticket: (ticketId: string) => ["tickets", "detail", ticketId] as const,
  ticketMessages: (ticketId: string) =>
    ["tickets", "messages", ticketId] as const,
  tickets: (userId: string) => ["tickets", "list", userId] as const,
  unreadNotifications: (userId: string) =>
    ["notifications", userId, "unread"] as const,
  verifiedPhones: (userId: string) => ["verified-phones", userId] as const,
  whatsappSettings: (userId: string) => ["whatsapp-settings", userId] as const,
  wishlist: (userId: string) => ["wishlist", userId] as const,
};

export const requireUserId = (userId: string | undefined) => {
  if (!userId) {
    throw new Error("Not signed in");
  }
  return userId;
};

/** Throws the Supabase error, else returns the data. */
export const unwrap = <T>({ data, error }: { data: T; error: unknown }): T => {
  if (error) {
    throw error;
  }
  return data;
};

export const useMemberships = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: () => listMemberships(supabase, requireUserId(user?.id)),
    queryKey: queryKeys.memberships(user?.id ?? ""),
  });
};

export const useProfile = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, locale, marketing_opt_in, created_at, updated_at"
          )
          .eq("id", requireUserId(user?.id))
          .single()
      ),
    queryKey: queryKeys.profile(user?.id ?? ""),
  });
};

export const usePendingInvitations = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => unwrap(await supabase.rpc("pending_invitations")),
    queryKey: queryKeys.invitations(user?.id ?? ""),
  });
};

export const useProjects = (organizationId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("projects")
          .select("id, name, created_at")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
      ),
    queryKey: queryKeys.projects(organizationId),
  });
};

/** Active plans for one product line: business (Partners) or Plus. */
export const usePlans = (audience: "business" | "plus") => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("plans")
          .select(
            "id, name, name_ar, description, amount, currency, billing_interval, rental_slots, tier, features_ar, features_en"
          )
          .eq("active", true)
          .eq("audience", audience)
          .is("student_of", null)
          .order("position")
          .order("amount")
      ),
    queryKey: queryKeys.plans(audience),
  });
};

const LIVE_SUBSCRIPTION = ["active", "past_due", "incomplete"] as const;
const SUBSCRIPTION_COLUMNS =
  "id, plan_id, status, current_period_end, cancel_at_period_end, provider" as const;

export const useSubscription = (organizationId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("subscriptions")
          .select(SUBSCRIPTION_COLUMNS)
          .eq("organization_id", organizationId)
          .in("status", LIVE_SUBSCRIPTION)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ),
    queryKey: queryKeys.subscription(organizationId),
  });
};

/** The signed-in user's own (The IDEA Plus) subscription. */
export const usePlusSubscription = (refetchInterval?: number | false) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("subscriptions")
          .select(SUBSCRIPTION_COLUMNS)
          .eq("user_id", requireUserId(user?.id))
          .in("status", LIVE_SUBSCRIPTION)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ),
    queryKey: queryKeys.plusSubscription(user?.id ?? ""),
    refetchInterval,
  });
};

const PAYMENT_COLUMNS =
  "id, amount, currency, status, description, created_at, reference_id" as const;

/** Owners and admins only (RLS returns nothing for members). */
export const usePayments = (organizationId: string, enabled: boolean) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("payments")
          .select(PAYMENT_COLUMNS)
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(20)
      ),
    queryKey: queryKeys.payments(organizationId),
  });
};

/** The user's Plus payments (not organizations', not store orders). */
export const usePlusPayments = (refetchInterval?: number | false) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("payments")
          .select(PAYMENT_COLUMNS)
          .eq("user_id", requireUserId(user?.id))
          .is("organization_id", null)
          .is("order_id", null)
          .order("created_at", { ascending: false })
          .limit(10)
      ),
    queryKey: queryKeys.plusPayments(user?.id ?? ""),
    refetchInterval,
  });
};
