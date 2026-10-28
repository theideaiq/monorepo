"use client";

import { useAuth } from "@repo/auth/provider";
import type { Database } from "@repo/database";
import { buckets, removeFiles, uploadOrganizationFile } from "@repo/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Partners → Selling: the organization's shop on The IDEA (its
 * application and status) and, for owners and admins, the documents and
 * payout details staff review. Row Level Security keeps the details to
 * owners, admins and staff.
 */

export type Seller = Database["public"]["Tables"]["sellers"]["Row"];
export type SellerDetails =
  Database["public"]["Tables"]["seller_details"]["Row"];

/** At most this many documents per shop (the database enforces it). */
export const MAX_DOCUMENTS = 10;

const sellerKey = (organizationId: string) =>
  ["seller", organizationId] as const;

const unwrap = <T>({ data, error }: { data: T; error: unknown }) => {
  if (error) {
    throw error;
  }
  return data;
};

/** The organization's shop with its details (null details for members). */
export const useSeller = (organizationId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const seller = unwrap(
        await supabase
          .from("sellers")
          .select("*")
          .eq("organization_id", organizationId)
          .maybeSingle()
      );
      if (!seller) {
        return null;
      }
      const details = unwrap(
        await supabase
          .from("seller_details")
          .select("*")
          .eq("seller_id", seller.id)
          .maybeSingle()
      );
      return { details, seller };
    },
    queryKey: sellerKey(organizationId),
  });
};

/** Applies to sell (or sends a rejected application again). */
export const useApplyToSell = (organizationId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) =>
      unwrap(
        await supabase.rpc("apply_to_sell", {
          org: organizationId,
          seller_name: name.trim(),
        })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sellerKey(organizationId) }),
  });
};

export interface PayoutDetails {
  accountName: string;
  bank: string;
  iban: string;
}

/** IBANs as people type them: no spaces, capital letters. */
export const normalizeIban = (value: string) =>
  value.replaceAll(/\s+/g, "").toUpperCase();

const IBAN = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/;

/** Whether `value` (normalized) has the shape of an IBAN. */
export const isIban = (value: string) => IBAN.test(normalizeIban(value));

/** Saves where payouts go (owners and admins). */
export const useSavePayoutDetails = (
  organizationId: string,
  sellerId: string
) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payout: PayoutDetails) => {
      unwrap(
        await supabase
          .from("seller_details")
          .update({
            payout_account_name: payout.accountName.trim() || null,
            payout_bank: payout.bank.trim() || null,
            payout_iban: normalizeIban(payout.iban) || null,
          })
          .eq("seller_id", sellerId)
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sellerKey(organizationId) }),
  });
};

/** Adds a document: uploaded to the organization's folder, then listed. */
export const useAddDocument = (
  organizationId: string,
  sellerId: string,
  documents: readonly string[]
) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const stored = await uploadOrganizationFile(
        supabase,
        organizationId,
        file
      );
      unwrap(
        await supabase
          .from("seller_details")
          .update({ documents: [...documents, stored.path] })
          .eq("seller_id", sellerId)
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sellerKey(organizationId) }),
  });
};

/** Removes a document from the list and from storage. */
export const useRemoveDocument = (
  organizationId: string,
  sellerId: string,
  documents: readonly string[]
) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (path: string) => {
      unwrap(
        await supabase
          .from("seller_details")
          .update({ documents: documents.filter((item) => item !== path) })
          .eq("seller_id", sellerId)
      );
      await removeFiles(supabase, buckets.orgFiles.id, [path]);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sellerKey(organizationId) }),
  });
};
