"use client";

import { useAuth } from "@repo/auth/provider";
import type { Database } from "@repo/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AddressForm, MapPin } from "./address";
import { requireUserId, unwrap } from "./queries";

/**
 * The address book (Pass → Settings and checkout): the member's saved
 * delivery addresses (`user_addresses`, theirs only), and how they last
 * chose to pay (`profiles.checkout_payment`).
 */

export type SavedAddress =
  Database["public"]["Tables"]["user_addresses"]["Row"];
export type PaymentMethod = Database["public"]["Enums"]["order_payment_method"];

/** At most this many addresses each (the database enforces it). */
export const MAX_ADDRESSES = 10;

const addressesKey = (userId: string) => ["addresses", userId] as const;
const paymentKey = (userId: string) => ["checkout-payment", userId] as const;

/** The saved addresses, the default first, then the newest. */
export const useAddresses = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("user_addresses")
          .select("*")
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false })
      ),
    queryKey: addressesKey(user?.id ?? ""),
  });
};

/** The checkout form filled from a saved address. */
export const addressToForm = (saved: SavedAddress): AddressForm => ({
  address: saved.street,
  city: saved.area,
  fullName: saved.full_name,
  governorate: saved.governorate,
  landmark: saved.landmark,
  location:
    saved.latitude !== null && saved.longitude !== null
      ? { lat: Number(saved.latitude), lng: Number(saved.longitude) }
      : null,
  notes: "",
  phone: saved.phone,
  zoneId: saved.zone_id ?? "",
});

export interface AddressInput {
  area: string;
  fullName: string;
  governorate: string;
  isDefault?: boolean;
  label: string;
  landmark: string;
  location: MapPin | null;
  /** E.164 (already normalized). */
  phone: string;
  street: string;
  zoneId: string | null;
}

const toRow = (input: AddressInput) => ({
  area: input.area.trim(),
  full_name: input.fullName.trim(),
  governorate: input.governorate,
  is_default: input.isDefault ?? false,
  label: input.label.trim(),
  landmark: input.landmark.trim(),
  latitude: input.location?.lat ?? null,
  longitude: input.location?.lng ?? null,
  phone: input.phone,
  street: input.street.trim(),
  zone_id: input.zoneId,
});

/** Adds an address, or changes the one with `id`. */
export const useSaveAddress = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: AddressInput }) => {
      const row = toRow(input);
      const result = id
        ? await supabase.from("user_addresses").update(row).eq("id", id)
        : await supabase.from("user_addresses").insert(row);
      if (result.error) {
        throw result.error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: addressesKey(requireUserId(user?.id)),
      }),
  });
};

export const useRemoveAddress = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_addresses")
        .delete()
        .eq("id", id);
      if (error) {
        throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: addressesKey(requireUserId(user?.id)),
      }),
  });
};

export const useMakeDefaultAddress = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_addresses")
        .update({ is_default: true })
        .eq("id", id);
      if (error) {
        throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: addressesKey(requireUserId(user?.id)),
      }),
  });
};

/** How the member last chose to pay; null until they have. */
export const useCheckoutPayment = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("profiles")
          .select("checkout_payment")
          .eq("id", requireUserId(user?.id))
          .single()
      )?.checkout_payment ?? null,
    queryKey: paymentKey(user?.id ?? ""),
  });
};

/** Remembers the way to pay for next time (best effort). */
export const useRememberPayment = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (method: PaymentMethod) => {
      const { error } = await supabase
        .from("profiles")
        .update({ checkout_payment: method })
        .eq("id", requireUserId(user?.id));
      if (error) {
        throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: paymentKey(requireUserId(user?.id)),
      }),
  });
};

/** "Street 62, Karrada" (with the Arabic comma on Arabic pages). */
export const addressLine = (saved: SavedAddress, locale: string) =>
  [saved.street, saved.area]
    .filter(Boolean)
    .join(locale === "ar" ? "، " : ", ");

/** The device's location, rounded like the database keeps it. */
export const currentPin = () =>
  new Promise<MapPin>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          lat: Math.round(coords.latitude * 1e6) / 1e6,
          lng: Math.round(coords.longitude * 1e6) / 1e6,
        }),
      reject,
      { enableHighAccuracy: true, timeout: 15_000 }
    );
  });

/** Whether `pin` is in Iraq (what the database accepts). */
export const pinInIraq = (pin: MapPin) =>
  pin.lat >= 28.5 && pin.lat <= 37.5 && pin.lng >= 38.5 && pin.lng <= 49;

/** A link that opens the pin in the phone's maps app. */
export const pinLink = (pin: MapPin) =>
  `https://www.google.com/maps/search/?api=1&query=${pin.lat},${pin.lng}`;
