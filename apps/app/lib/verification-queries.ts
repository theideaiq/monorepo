"use client";

import { useAuth } from "@repo/auth/provider";
import { uploadVerificationFile } from "@repo/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { callApi } from "./api";
import { requireUserId, unwrap } from "./queries";

/**
 * Pass → Settings → Verification: the identity check (both sides of the
 * National Card and a selfie, reviewed by support) and the educator badge
 * (a staff email code, or a staff card or letter reviewed by support).
 */

export interface MyVerifications {
  educator: {
    institution: string | null;
    /** `email` while a code is out, `documents` while support reviews. */
    pending: "documents" | "email" | null;
    rejected_reason: string | null;
    valid_until: string | null;
    verified: boolean;
  };
  identity: {
    name: string | null;
    pending: boolean;
    rejected_reason: string | null;
    verified: boolean;
    verified_at: string | null;
  };
}

const verificationsKey = (userId: string) => ["verifications", userId] as const;

export const useMyVerifications = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase.rpc("my_verifications")
      ) as unknown as MyVerifications | null,
    queryKey: verificationsKey(user?.id ?? ""),
  });
};

const useUploadAll = () => {
  const { supabase, user } = useAuth();
  return async (files: File[]) => {
    const userId = requireUserId(user?.id);
    const stored = await Promise.all(
      files.map((file) => uploadVerificationFile(supabase, userId, file))
    );
    return stored.map((file) => file.path);
  };
};

/** Uploads the card's two sides and the selfie, then asks for the check. */
export const useRequestIdentityCheck = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const uploadAll = useUploadAll();
  return useMutation({
    mutationFn: async (files: [File, File, File]) =>
      unwrap(
        await supabase.rpc("request_identity_check", {
          files: await uploadAll(files),
        })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: verificationsKey(user?.id ?? ""),
      }),
  });
};

/** Uploads a staff card or employer letter (one or two files) for review. */
export const useRequestEducatorCheck = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const uploadAll = useUploadAll();
  return useMutation({
    mutationFn: async ({
      files,
      institution,
    }: {
      files: File[];
      institution: string;
    }) =>
      unwrap(
        await supabase.rpc("request_educator_check", {
          files: await uploadAll(files),
          institution,
        })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: verificationsKey(user?.id ?? ""),
      }),
  });
};

/** Emails a code to a staff address at a university (through the API). */
export const useSendEducatorCode = () => {
  const { supabase } = useAuth();
  return useMutation({
    mutationFn: (input: {
      email: string;
      locale: string;
      university: string;
    }) => callApi<{ sent: boolean }>(supabase, "/pass/educator-code", input),
  });
};

export const useConfirmEducatorEmail = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) =>
      unwrap(await supabase.rpc("confirm_educator_email", { code })),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: verificationsKey(user?.id ?? ""),
      }),
  });
};
