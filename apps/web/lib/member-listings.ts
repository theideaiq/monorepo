"use client";

import { useAuth } from "@repo/auth/provider";
import type { Database } from "@repo/database";
import {
  getMemberListingPhotoUrls,
  uploadMemberListingPhoto,
} from "@repo/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireUserId, unwrap } from "./queries";

/**
 * People selling (migration `20270311000000_member_listings.sql`): a
 * person with a verified identity lists their own things; another person
 * buys at the price or offers less; they meet, the buyer pays the seller
 * in cash, and the money never passes through The IDEA. Contact details
 * are never shared: the two write through messages The IDEA passes on.
 */

export type ListingStatus =
  Database["public"]["Enums"]["member_listing_status"];
export type DealStatus = Database["public"]["Enums"]["member_deal_status"];
type Condition = Database["public"]["Enums"]["product_condition"];

/** Photos per listing, the lowest price and live listings a seller may have. */
export const MIN_PHOTOS = 3;
export const MAX_PHOTOS = 8;
export const MIN_PRICE = 1000;
export const MAX_LIVE = 20;

const LISTINGS = ["member-listings"] as const;
const mineKey = (userId: string) => [...LISTINGS, "mine", userId] as const;
const dealsKey = (userId: string) => [...LISTINGS, "deals", userId] as const;

const LISTING_COLUMNS =
  "id, number, title, condition, description, photos, governorate, price, accepts_offers, status, expires_at, sold_at, removed_reason, created_at" as const;

/** Live listings, newest first: for one product, in one area or by title. */
export const useListingsForSale = ({
  governorate,
  product,
  search,
}: {
  governorate?: string;
  product?: string;
  search?: string;
} = {}) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase.rpc("member_listings_for_sale", {
          governorate: governorate || undefined,
          product: product || undefined,
          search: search?.trim() || undefined,
        })
      ) ?? [],
    queryKey: [
      ...LISTINGS,
      "sale",
      product ?? "",
      governorate ?? "",
      search ?? "",
    ],
  });
};

export type ListingForSale = NonNullable<
  ReturnType<typeof useListingsForSale>["data"]
>[number];

/** One listing by its number (live, or the caller's own or dealt on). */
export const useListing = (number: number) => {
  const { supabase, user } = useAuth();
  return useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase.rpc("member_listing", { listing_number: number })
      ) ?? [])[0] ?? null,
    queryKey: [...LISTINGS, "one", number, user?.id ?? ""],
  });
};

export type Listing = NonNullable<ReturnType<typeof useListing>["data"]>;

/** The seller's own listings, newest first. */
export const useMyListings = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("member_listings")
          .select(LISTING_COLUMNS)
          .eq("user_id", requireUserId(user?.id))
          .order("created_at", { ascending: false })
          .limit(50)
      ) ?? [],
    queryKey: mineKey(user?.id ?? ""),
    refetchInterval: 60_000,
  });
};

export type MyListing = NonNullable<
  ReturnType<typeof useMyListings>["data"]
>[number];

/**
 * The caller's deals as buyer and seller (the last 90 days), each with its
 * messages, oldest first.
 */
export const useMyDeals = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => {
      const deals = unwrap(await supabase.rpc("my_member_deals")) ?? [];
      const ids = deals.map((deal) => deal.id);
      const messages =
        ids.length === 0
          ? []
          : (unwrap(
              await supabase
                .from("member_messages")
                .select("id, deal_id, from_seller, body, created_at")
                .in("deal_id", ids)
                .order("id", { ascending: true })
            ) ?? []);
      return deals.map((deal) => ({
        ...deal,
        messages: messages.filter((message) => message.deal_id === deal.id),
      }));
    },
    queryKey: dealsKey(user?.id ?? ""),
    refetchInterval: 60_000,
  });
};

export type MyDeal = NonNullable<ReturnType<typeof useMyDeals>["data"]>[number];

/** Signed links to a listing's photos (private bucket), in order. */
export const useListingPhotos = (paths: readonly string[]) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: paths.length > 0,
    queryFn: () => getMemberListingPhotoUrls(supabase, paths),
    queryKey: ["member-listing-photos", ...paths],
    staleTime: 30 * 60 * 1000,
  });
};

const useRefresh = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: LISTINGS });
};

export interface NewListing {
  acceptsOffers: boolean;
  condition: Condition;
  description: string;
  governorate: string;
  photos: File[];
  price: number;
  title: string;
}

/** Uploads the photos to the seller's folder, then lists the item. */
export const useCreateListing = () => {
  const { supabase, user } = useAuth();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (listing: NewListing) => {
      const userId = requireUserId(user?.id);
      const uploaded = await Promise.all(
        listing.photos.map((file) =>
          uploadMemberListingPhoto(supabase, userId, file)
        )
      );
      return unwrap(
        await supabase.rpc("create_member_listing", {
          accepts_offers: listing.acceptsOffers,
          condition: listing.condition,
          description: listing.description,
          governorate: listing.governorate,
          photos: uploaded.map((file) => file.path),
          price: listing.price,
          title: listing.title,
        })
      );
    },
    onSettled: refresh,
  });
};

type ListingAction = "remove" | "renew";

/** Takes a listing down, or puts an expired one back for 30 days. */
export const useListingAction = () => {
  const { supabase } = useAuth();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({
      action,
      target,
    }: {
      action: ListingAction;
      target: string;
    }) =>
      action === "remove"
        ? unwrap(await supabase.rpc("remove_member_listing", { target }))
        : unwrap(await supabase.rpc("renew_member_listing", { target })),
    onSettled: refresh,
  });
};

/** Buys at the price (no amount) or offers less where offers are allowed. */
export const useBuyListing = () => {
  const { supabase } = useAuth();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({
      amount,
      note,
      target,
    }: {
      amount?: number;
      note?: string;
      target: string;
    }) =>
      unwrap(
        await supabase.rpc("buy_member_listing", {
          amount,
          note: note || undefined,
          target,
        })
      ),
    onSettled: refresh,
  });
};

type DealAction = "accept" | "decline" | "withdraw" | "sold" | "callOff";

/**
 * The seller accepts or declines an offer and marks the item sold; the
 * buyer withdraws a waiting offer; either side calls an agreed sale off.
 */
export const useDealAction = () => {
  const { supabase } = useAuth();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({
      action,
      target,
    }: {
      action: DealAction;
      target: string;
    }) => {
      if (action === "withdraw") {
        return unwrap(await supabase.rpc("withdraw_member_deal", { target }));
      }
      if (action === "accept" || action === "decline") {
        return unwrap(
          await supabase.rpc("answer_member_deal", {
            accept: action === "accept",
            target,
          })
        );
      }
      return unwrap(
        await supabase.rpc("finish_member_deal", {
          done: action === "sold",
          target,
        })
      );
    },
    onSettled: refresh,
  });
};

export const useSendDealMessage = () => {
  const { supabase } = useAuth();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({ body, target }: { body: string; target: string }) =>
      unwrap(await supabase.rpc("send_member_message", { body, target })),
    onSettled: refresh,
  });
};

/** The database's refusal message, when it's one of ours (a check violation). */
export const listingRefusal = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error.code === "23514" || error.code === "23505") &&
  "message" in error
    ? String(error.message)
    : null;
