"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { callApi, callPublicApi } from "./api";
import { unwrap } from "./queries";

/**
 * A partner's student verification (theideaiq.com/verify/<id>): what the
 * page shows, and each way to finish it through apps/api.
 */

export type VerificationStatus =
  | "pending"
  | "rejected"
  | "started"
  | "verified";

export interface VerificationPage {
  /** The signed-in Pass holder's valid badge, for one tap. */
  badge: { university: string; valid_until: string } | null;
  code_sent: boolean;
  id: string;
  method: "document" | "email" | "pass" | null;
  partner: string;
  reject_reason: string | null;
  return_url: string;
  status: VerificationStatus;
  university: string | null;
  valid_until: string | null;
  website: string;
}

const key = (id: string, userId: string) =>
  ["partner-verification", id, userId] as const;

export const useVerificationPage = (id: string) => {
  const { supabase, user } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase.rpc("student_verification_page", { target: id })
      ) as unknown as VerificationPage | null,
    queryKey: key(id, user?.id ?? ""),
  });
};

const path = (id: string, step: string) =>
  `/v1/student-verifications/${encodeURIComponent(id)}/${step}`;

const useRefresh = (id: string) => {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ["partner-verification", id] });
};

/** One tap: share the signed-in Pass's badge. */
export const useShareVerification = (id: string, locale: string) => {
  const { supabase } = useAuth();
  const refresh = useRefresh(id);
  return useMutation({
    mutationFn: () => callApi(supabase, path(id, "share"), { locale }),
    onSuccess: refresh,
  });
};

export const useSendVerificationCode = (id: string, locale: string) => {
  const refresh = useRefresh(id);
  return useMutation({
    mutationFn: (input: { email: string; university: string }) =>
      callPublicApi(path(id, "email"), { ...input, locale }),
    onSuccess: refresh,
  });
};

export const useConfirmVerificationCode = (id: string, locale: string) => {
  const refresh = useRefresh(id);
  return useMutation({
    mutationFn: (code: string) =>
      callPublicApi(path(id, "code"), { code, locale }),
    onSuccess: refresh,
  });
};

export const useSendVerificationDocument = (id: string, locale: string) => {
  const refresh = useRefresh(id);
  return useMutation({
    mutationFn: (input: {
      email: string;
      file: File;
      kind: "card" | "enrollment";
      university: string;
    }) => {
      const form = new FormData();
      form.set("email", input.email);
      form.set("file", input.file);
      form.set("kind", input.kind);
      form.set("locale", locale);
      form.set("university", input.university);
      return callPublicApi(path(id, "document"), form);
    },
    onSuccess: refresh,
  });
};

export const useDeleteVerification = (id: string) =>
  useMutation({
    mutationFn: (token: string) => callPublicApi(path(id, "delete"), { token }),
  });

/** The message a partner's page gets from the popup or the frame. */
export const VERIFICATION_MESSAGE = "theideaiq:student_verification";

/**
 * Back to the partner: a popup tells its opener and closes, a frame tells
 * its parent, and a full page goes to the return address with the id and
 * the status.
 */
export const returnToPartner = (page: VerificationPage) => {
  const message = {
    id: page.id,
    status: page.status,
    type: VERIFICATION_MESSAGE,
  };
  const target = new URL(page.return_url);
  if (window.opener && window.opener !== window) {
    window.opener.postMessage(message, target.origin);
    window.close();
    return;
  }
  if (window.parent !== window) {
    window.parent.postMessage(message, "*");
    return;
  }
  target.searchParams.set("student_verification", page.id);
  target.searchParams.set("status", page.status);
  window.location.assign(target.toString());
};
