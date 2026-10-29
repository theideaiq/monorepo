"use client";

import { useAuth } from "@repo/auth/provider";
import type { Database } from "@repo/database";
import { getSellRequestPhotoUrls, uploadSellRequestPhoto } from "@repo/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireUserId, unwrap } from "./queries";

/**
 * Get offers from shops (migration `20270309000000_sell_requests.sql`): a
 * member describes an item with photos, approved shops send offers to buy
 * it, the member accepts one or none, and the two sides talk through
 * messages The IDEA passes on. Contact details are never shared.
 */

export type SellRequestStatus =
  Database["public"]["Enums"]["sell_request_status"];
export type SellOfferStatus = Database["public"]["Enums"]["sell_offer_status"];
type Condition = Database["public"]["Enums"]["product_condition"];

/** Photos per request (the database enforces it). */
export const MIN_PHOTOS = 3;
export const MAX_PHOTOS = 8;
/** Open requests a member may have at once. */
export const MAX_OPEN = 5;

const requestsKey = (userId: string) => ["sell-requests", userId] as const;

const REQUEST_COLUMNS =
  "id, number, title, condition, description, photos, governorate, status, expires_at, created_at, offers:sell_offers (id, amount, check_method, pay_method, note, status, expires_at, created_at, seller:sellers (name), messages:sell_messages (id, from_shop, body, created_at))" as const;

/** The member's requests with their offers and messages, newest first. */
export const useMySellRequests = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("sell_requests")
          .select(REQUEST_COLUMNS)
          .eq("user_id", requireUserId(user?.id))
          .order("created_at", { ascending: false })
          .limit(30)
      ) ?? [],
    queryKey: requestsKey(user?.id ?? ""),
    refetchInterval: 60_000,
  });
};

export type MySellRequest = NonNullable<
  ReturnType<typeof useMySellRequests>["data"]
>[number];
export type MySellOffer = MySellRequest["offers"][number];

/** Signed links to a request's photos (private bucket). */
export const useSellPhotos = (paths: readonly string[]) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: paths.length > 0,
    queryFn: () => getSellRequestPhotoUrls(supabase, paths),
    queryKey: ["sell-photos", ...paths],
    staleTime: 30 * 60 * 1000,
  });
};

const useRefresh = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: requestsKey(user?.id ?? "") });
};

export interface NewSellRequest {
  condition: Condition;
  description: string;
  governorate: string;
  photos: File[];
  title: string;
}

/** Uploads the photos to the member's folder, then opens the request. */
export const useCreateSellRequest = () => {
  const { supabase, user } = useAuth();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (request: NewSellRequest) => {
      const userId = requireUserId(user?.id);
      const uploaded = await Promise.all(
        request.photos.map((file) =>
          uploadSellRequestPhoto(supabase, userId, file)
        )
      );
      return unwrap(
        await supabase.rpc("create_sell_request", {
          condition: request.condition,
          description: request.description,
          governorate: request.governorate,
          photos: uploaded.map((file) => file.path),
          title: request.title,
        })
      );
    },
    onSettled: refresh,
  });
};

export const useCloseSellRequest = () => {
  const { supabase } = useAuth();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (target: string) =>
      unwrap(await supabase.rpc("close_sell_request", { target })),
    onSettled: refresh,
  });
};

/** Accepts an offer (declining the rest) or declines it. */
export const useAnswerSellOffer = () => {
  const { supabase } = useAuth();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({
      accept,
      target,
    }: {
      accept: boolean;
      target: string;
    }) => unwrap(await supabase.rpc("answer_sell_offer", { accept, target })),
    onSettled: refresh,
  });
};

/** Calls off an accepted offer (only the shop marks a sale done). */
export const useCancelSellOffer = () => {
  const { supabase } = useAuth();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (target: string) =>
      unwrap(await supabase.rpc("finish_sell_offer", { done: false, target })),
    onSettled: refresh,
  });
};

export const useSendSellMessage = () => {
  const { supabase } = useAuth();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({ body, target }: { body: string; target: string }) =>
      unwrap(await supabase.rpc("send_sell_message", { body, target })),
    onSettled: refresh,
  });
};

/** The database's refusal message, when it's one of ours (a check violation). */
export const sellRefusal = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23514" &&
  "message" in error
    ? String(error.message)
    : null;
