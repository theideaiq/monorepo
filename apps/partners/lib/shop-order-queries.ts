"use client";

import { useAuth } from "@repo/auth/provider";
import type { Database } from "@repo/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { callApi } from "./api";
import { unwrap } from "./queries";

/**
 * Partners → Selling → Orders and Pickup: the shop's order lines (the
 * customer only as "first name · area"), its pickup branches, readying
 * lines for Boxy, printing labels and marking lines out of stock.
 */

export type ShopLine =
  Database["public"]["Functions"]["seller_order_lines"]["Returns"][number];
export type ShopLocation =
  Database["public"]["Tables"]["seller_locations"]["Row"];

const linesKey = (sellerId: string) => ["shop-lines", sellerId] as const;
const locationsKey = (sellerId: string) =>
  ["shop-locations", sellerId] as const;

export const useShopLines = (sellerId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(sellerId),
    queryFn: async () =>
      unwrap(await supabase.rpc("seller_order_lines", { shop: sellerId })) ??
      [],
    queryKey: linesKey(sellerId),
  });
};

export const useShopLocations = (sellerId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(sellerId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("seller_locations")
          .select("*")
          .eq("seller_id", sellerId)
          .order("created_at")
      ) ?? [],
    queryKey: locationsKey(sellerId),
  });
};

/** Boxy's areas, to place a branch. */
export const useAreas = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("delivery_areas")
          .select("id, name, province")
          .eq("active", true)
          .order("province")
          .order("name")
      ) ?? [],
    queryKey: ["delivery-areas"],
    staleTime: 60 * 60 * 1000,
  });
};

export interface LocationInput {
  address: string;
  contact_name: string;
  contact_phone: string;
  lat: number;
  lng: number;
  name: string;
  region_id: string;
}

/**
 * Adds or edits a branch (owners and admins; Row Level Security decides),
 * then has the API save it in Boxy.
 */
export const useSaveLocation = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id?: string;
      input: LocationInput;
    }) => {
      const saved = id
        ? unwrap(
            await supabase
              .from("seller_locations")
              .update(input)
              .eq("id", id)
              .select("id")
              .single()
          )
        : unwrap(
            await supabase
              .from("seller_locations")
              .insert({ ...input, seller_id: sellerId })
              .select("id")
              .single()
          );
      if (!saved) {
        throw new Error("The branch wasn't saved");
      }
      await callApi(supabase, "/v1/selling/locations/sync", {
        location: saved.id,
      });
      return saved;
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: locationsKey(sellerId) }),
  });
};

/** Sends a branch to Boxy again (after a failed first try). */
export const useSyncLocation = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (location: string) =>
      callApi(supabase, "/v1/selling/locations/sync", { location }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: locationsKey(sellerId) }),
  });
};

export const useSetLocationActive = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ active, id }: { active: boolean; id: string }) =>
      unwrap(
        await supabase.from("seller_locations").update({ active }).eq("id", id)
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: locationsKey(sellerId) }),
  });
};

export interface ReadyResult {
  parcels: {
    orderId: string;
    shipmentId: string;
    trackingCode: string | null;
  }[];
  pickupRequested: boolean;
}

/** "Ready for pickup": readies the lines at a branch and sends the parcels. */
export const useReadyLines = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      lines: string[];
      location: string;
      size: "L" | "M" | "S";
    }) => callApi<ReadyResult>(supabase, "/v1/selling/ready", input),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: linesKey(sellerId) }),
  });
};

export const useOutOfStock = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (line: string) =>
      unwrap(await supabase.rpc("mark_line_out_of_stock", { line })),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: linesKey(sellerId) }),
  });
};

/** The parcel's label: opens Boxy's PDF (or link) in a new tab. */
export const useLabel = () => {
  const { supabase } = useAuth();
  return useMutation({
    mutationFn: async (shipment: string) => {
      const label = await callApi<{ pdf?: string; url?: string }>(
        supabase,
        "/v1/selling/label",
        { shipment }
      );
      if (label.url) {
        return label.url;
      }
      const bytes = Uint8Array.from(atob(label.pdf ?? ""), (char) =>
        char.charCodeAt(0)
      );
      return URL.createObjectURL(
        new Blob([bytes], { type: "application/pdf" })
      );
    },
    onSuccess: (url) => {
      window.open(url, "_blank", "noopener");
    },
  });
};
