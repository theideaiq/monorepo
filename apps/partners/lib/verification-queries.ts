"use client";

import { useAuth } from "@repo/auth/provider";
import { uploadOrganizationFile } from "@repo/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Partners → Organization → Verification: a domain the organization
 * verified in Developers verifies it at once; otherwise an official letter
 * (and, for a student society, the university's approval) goes to The
 * IDEA's team. Files go to the organization's folder.
 */

const verificationKey = (organizationId: string) =>
  ["organization-verification", organizationId] as const;

const unwrap = <T>({ data, error }: { data: T; error: unknown }) => {
  if (error) {
    throw error;
  }
  return data;
};

export const useOrganizationVerification = (organizationId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("organization_verifications")
          .select(
            "method, status, is_student_society, university, reject_reason, verified_at"
          )
          .eq("organization_id", organizationId)
          .maybeSingle()
      ),
    queryKey: verificationKey(organizationId),
  });
};

export interface OrganizationCheckInput {
  approval: File | null;
  letter: File | null;
  method: "domain" | "letter";
  society: boolean;
  university: string;
}

/** Uploads the files, then asks for the check ("verified" or "pending"). */
export const useRequestOrganizationCheck = (organizationId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const store = async (file: File | null) =>
    file
      ? (await uploadOrganizationFile(supabase, organizationId, file)).path
      : undefined;
  return useMutation({
    mutationFn: async (input: OrganizationCheckInput) =>
      unwrap(
        await supabase.rpc("request_organization_check", {
          approval: input.society ? await store(input.approval) : undefined,
          letter:
            input.method === "letter" ? await store(input.letter) : undefined,
          method: input.method,
          org: organizationId,
          student_society: input.society,
          university: input.society ? input.university.trim() : undefined,
        })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: verificationKey(organizationId),
      }),
  });
};

/** The database's messages, as message keys. */
export const organizationCheckError = (message: string | undefined) => {
  if (message?.includes("Verify a domain")) {
    return "noDomain" as const;
  }
  if (message?.includes("university")) {
    return "society" as const;
  }
  return "failed" as const;
};
