"use client";

import { useAuth } from "@repo/auth/provider";
import {
  getTradeInPhotoUrls,
  removeFiles,
  uploadTradeInPhoto,
} from "@repo/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, requireUserId, unwrap } from "./queries";
import { contactPhone, parseAskingPrice, type TradeInDraft } from "./trade-ins";

/** "Sell to us": the customer's requests, sending one, and their answers. */

const TRADE_IN_COLUMNS =
  "id, number, category, title, description, condition, asking_price, payout, photos, status, offer_amount, offer_note, offered_at, created_at" as const;

export const useMyTradeIns = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("trade_ins")
          .select(TRADE_IN_COLUMNS)
          .eq("user_id", requireUserId(user?.id))
          .order("created_at", { ascending: false })
      ),
    queryKey: queryKeys.tradeIns(user?.id ?? ""),
  });
};

/** Short-lived links to a request's photos (private bucket). */
export const useTradeInPhotoUrls = (paths: readonly string[]) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: paths.length > 0,
    queryFn: () => getTradeInPhotoUrls(supabase, [...paths]),
    queryKey: queryKeys.tradeInPhotos(paths),
    // The links last an hour; refresh well before.
    staleTime: 30 * 60 * 1000,
  });
};

/** Uploads the photos, then records the request; cleans up on failure. */
export const useSubmitTradeIn = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (draft: TradeInDraft) => {
      const userId = requireUserId(user?.id);
      const phone = contactPhone(draft.phone);
      if (!phone) {
        throw new Error("invalid phone");
      }
      const stored = await Promise.all(
        draft.photos.map((photo) => uploadTradeInPhoto(supabase, userId, photo))
      );
      const paths = stored.map((file) => file.path);
      const { error } = await supabase.from("trade_ins").insert({
        asking_price: parseAskingPrice(draft.askingPrice),
        category: draft.category,
        condition: draft.condition,
        contact_phone: phone,
        description: draft.description.trim() || null,
        payout: draft.payout,
        photos: paths,
        title: draft.title.trim(),
        user_id: userId,
      });
      if (error) {
        if (paths.length) {
          await removeFiles(supabase, "trade-ins", paths).catch(
            () => undefined
          );
        }
        throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.tradeIns(user?.id ?? ""),
      }),
  });
};

/** respond_to_trade_in_offer(): accept or decline the offer. */
export const useRespondToTradeInOffer = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ accept, id }: { accept: boolean; id: string }) =>
      unwrap(
        await supabase.rpc("respond_to_trade_in_offer", {
          accept,
          trade_in: id,
        })
      ),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.tradeIns(user?.id ?? ""),
      }),
  });
};

/** withdraw_trade_in(): the customer takes a request back. */
export const useWithdrawTradeIn = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await supabase.rpc("withdraw_trade_in", { trade_in: id })),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.tradeIns(user?.id ?? ""),
      }),
  });
};
