"use client";

import { useAuth } from "@repo/auth/provider";
import { PRODUCT_CARD_COLUMNS, type ProductCard } from "@repo/commerce/catalog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { callApi } from "./api";
import { openCheckout } from "./hosted-checkout";
import { requireUserId, unwrap } from "./queries";

/**
 * "Vinyl from artists you listen to" (Pass → Saved → Vinyl): the member
 * connects Spotify or Last.fm through apps/api, and the Store's vinyl by
 * those artists is listed (`vinyl_from_my_artists`).
 */

const musicKey = (userId: string) => ["music", userId] as const;

/** Which services The IDEA has set up. */
export const useMusicServices = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: () =>
      callApi<{ lastfm: boolean; spotify: boolean }>(supabase, "/music", {
        check: true,
      }),
    queryKey: ["music-services"],
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
};

export interface MusicTaste {
  account: string;
  artists: number;
  provider: "lastfm" | "spotify";
}

/** The member's connection (or null) and the vinyl by their artists. */
export const useVinylForYou = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async (): Promise<{
      products: (ProductCard & { artist: string })[];
      taste: MusicTaste | null;
    }> => {
      const row = unwrap(
        await supabase
          .from("music_tastes")
          .select("provider, account, artists")
          .eq("user_id", requireUserId(user?.id))
          .maybeSingle()
      );
      if (!row) {
        return { products: [], taste: null };
      }
      const taste = {
        account: row.account,
        artists: row.artists.length,
        provider: row.provider as MusicTaste["provider"],
      };
      const matches =
        unwrap(
          await supabase.rpc("vinyl_from_my_artists", { max_items: 24 })
        ) ?? [];
      if (matches.length === 0) {
        return { products: [], taste };
      }
      const cards = (unwrap(
        await supabase
          .from("products")
          .select(PRODUCT_CARD_COLUMNS)
          .in(
            "id",
            matches.map((match) => match.product_id)
          )
      ) ?? []) as unknown as ProductCard[];
      const byId = new Map(cards.map((card) => [card.id, card]));
      // In the order of the artists the member listens to most.
      const products = matches.flatMap((match) => {
        const card = byId.get(match.product_id);
        return card ? [{ ...card, artist: match.artist }] : [];
      });
      return { products, taste };
    },
    queryKey: musicKey(user?.id ?? ""),
  });
};

const useMusicMutation = <Input>(run: (input: Input) => Promise<unknown>) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: musicKey(user?.id ?? "") }),
  });
};

/** Connects a Last.fm username (its artists are read at once). */
export const useConnectLastfm = () => {
  const { supabase } = useAuth();
  return useMusicMutation((account: string) =>
    callApi(supabase, "/music", { account: account.trim(), provider: "lastfm" })
  );
};

/** Opens Spotify's sign-in; it comes back to `returnTo` with ?music=… */
export const useConnectSpotify = () => {
  const { supabase } = useAuth();
  return useMutation({
    mutationFn: async (returnTo: string) => {
      const { url } = await callApi<{ url: string }>(supabase, "/music", {
        provider: "spotify",
        returnTo,
      });
      await openCheckout(url);
    },
  });
};

/** Forgets the connection and its artists (and Spotify's token). */
export const useDisconnectMusic = () => {
  const { supabase, user } = useAuth();
  return useMusicMutation(async () => {
    unwrap(
      await supabase
        .from("music_tastes")
        .delete()
        .eq("user_id", requireUserId(user?.id))
    );
  });
};
