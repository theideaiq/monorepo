"use client";

import { useAuth } from "@repo/auth/provider";
import type { OrderStatus } from "@repo/database";
import { localePath } from "@repo/internationalization";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { unwrap } from "./queries";

/** A gift as its link shows it (`gift_preview`, `received_gifts`). */
export interface GiftDetails {
  claimed: boolean;
  claimed_at?: string | null;
  /** The sender's first name. */
  from: string | null;
  governorate: string | null;
  items: {
    image: string | null;
    name_ar: string;
    name_en: string;
    quantity: number;
    slug: string | null;
    /** Null when the sender hid the price. */
    unit_price: number | null;
  }[];
  message: string | null;
  number?: number;
  order_id: string;
  /** Plus months in it, added to the recipient's Pass when claimed. */
  plus: {
    months: number;
    name: string;
    name_ar: string | null;
    plan_id: string;
    used: number;
  } | null;
  /** Paid, so it can be claimed (and then shipped). */
  ready: boolean;
  /** Something is delivered, so claiming asks for an address. */
  ships: boolean;
  status: OrderStatus;
  /** Null when the sender hid the price. */
  total: number | null;
  zone_id: string | null;
}

/** What the buyer's order page knows of its gift (`gifts`, by RLS). */
export interface SentGift {
  claimed_at: string | null;
  hide_price: boolean;
  message: string | null;
}

/** The link the recipient opens, on this site in this language. */
export const giftUrl = (origin: string, locale: string, token: string) =>
  `${origin}${localePath(locale, `/gift/${encodeURIComponent(token)}`)}`;

const giftKeys = {
  preview: (token: string) => ["gifts", "preview", token] as const,
  received: (userId: string) => ["gifts", "received", userId] as const,
  sent: (orderId: string) => ["gifts", "sent", orderId] as const,
};

/** The gift of one of the buyer's orders, or null. */
export const useSentGift = (orderId: string, enabled: boolean) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user && orderId && enabled),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("gifts")
          .select("message, hide_price, claimed_at")
          .eq("order_id", orderId)
          .maybeSingle()
      ) as SentGift | null,
    queryKey: giftKeys.sent(orderId),
  });
};

/**
 * A new link for the buyer's unclaimed gift (`gift_link`); the old one
 * stops working. Resolves with the full URL.
 */
export const useGiftLink = () => {
  const { supabase } = useAuth();
  const locale = useLocale();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const token = unwrap(
        await supabase.rpc("gift_link", { target: orderId })
      ) as string;
      return giftUrl(window.location.origin, locale, token);
    },
  });
};

/** What a gift link shows; anyone with the link can open it. */
export const useGiftPreview = (token: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(token),
    queryFn: async () =>
      unwrap(
        await supabase.rpc("gift_preview", { token })
      ) as unknown as GiftDetails,
    queryKey: giftKeys.preview(token),
    retry: false,
  });
};

/** The recipient takes the gift with their address (`claim_gift`). */
export const useClaimGift = (token: string) => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    // No address when nothing is delivered (only Plus months).
    mutationFn: async (shipping: object | null) =>
      unwrap(
        await supabase.rpc("claim_gift", {
          token,
          ...(shipping ? { shipping: { ...shipping } } : {}),
        })
      ) as string,
    // The link is spent now: its preview isn't refetched.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: giftKeys.received(user?.id ?? ""),
        }),
        // Plus months start Plus or wait for its renewals.
        queryClient.invalidateQueries({ queryKey: ["plus-subscription"] }),
        queryClient.invalidateQueries({ queryKey: ["plus-launch"] }),
      ]),
  });
};

/** The gifts the member has received, newest first. */
export const useReceivedGifts = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (unwrap(await supabase.rpc("received_gifts")) ??
        []) as unknown as GiftDetails[],
    queryKey: giftKeys.received(user?.id ?? ""),
  });
};
