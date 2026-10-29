"use client";

import { useAuth } from "@repo/auth/provider";
import { uploadStudentCard } from "@repo/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { callApi } from "./api";
import { requireUserId, unwrap } from "./queries";

/**
 * Student verification on The IDEA Pass: a university email or a student
 * card photo, and the Plus student prices.
 */

const studentKey = (userId: string) => ["student", userId] as const;

export const useMyStudent = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(await supabase.rpc("my_student").maybeSingle()) ?? null,
    queryKey: studentKey(user?.id ?? ""),
  });
};

export const useUniversities = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("universities")
          .select("id, name_ar, name_en")
          .eq("active", true)
          .order("position")
      ),
    queryKey: ["universities"],
    staleTime: 60 * 60 * 1000,
  });
};

/** The Plus student prices (20% off the monthly plans). */
export const useStudentPlans = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("plans")
          .select(
            "id, name, name_ar, description, amount, currency, billing_interval, rental_slots, tier, features_ar, features_en, student_of"
          )
          .eq("active", true)
          .eq("audience", "plus")
          .not("student_of", "is", null)
      ),
    queryKey: ["plans", "students"],
  });
};

/** Emails a code to the university address (through the API). */
export const useSendStudentCode = () => {
  const { supabase } = useAuth();
  return useMutation({
    mutationFn: (input: {
      email: string;
      locale: string;
      university: string;
    }) => callApi<{ sent: boolean }>(supabase, "/pass/student-code", input),
  });
};

export const useConfirmStudentEmail = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) =>
      unwrap(await supabase.rpc("confirm_student_email", { code })),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: studentKey(user?.id ?? "") }),
  });
};

/** Uploads the student card photo, then sends it for review. */
export const useRequestStudentReview = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      photo,
      university,
    }: {
      photo: File;
      university: string;
    }) => {
      const stored = await uploadStudentCard(
        supabase,
        requireUserId(user?.id),
        photo
      );
      return unwrap(
        await supabase.rpc("request_student_review", {
          photo: stored.path,
          university,
        })
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: studentKey(user?.id ?? "") }),
  });
};

// ── The student check (/verify) ────────────────────────────────────────────

const checkKey = (userId: string) => ["student", userId, "check"] as const;

/** Whether the Pass is bare (made by /verify, holding only the badge). */
export const useStudentCheck = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => {
      const profile = await supabase
        .from("profiles")
        .select("student_only")
        .eq("id", requireUserId(user?.id))
        .maybeSingle();
      return { bare: unwrap(profile)?.student_only ?? false };
    },
    queryKey: checkKey(user?.id ?? ""),
  });
};

/**
 * Starts the check for a Pass that just signed in on /verify: a new Pass is
 * bare, and the university email it signed in with verifies it (null when
 * the address isn't the university's).
 */
export const useClaimStudentEmail = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (university: string) => {
      unwrap(await supabase.rpc("begin_student_check"));
      const badge = unwrap(
        await supabase.rpc("claim_student_from_email", { university })
      );
      return badge?.user_id ? badge : null;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: studentKey(user?.id ?? "") }),
  });
};

/** A Pass that signed in on /verify to send its card photo. */
export const useBeginStudentCheck = () => {
  const { supabase } = useAuth();
  return useMutation({
    mutationFn: async () => unwrap(await supabase.rpc("begin_student_check")),
  });
};

/** Deletes the student status (and a bare Pass with it), through the API. */
export const useForgetStudentStatus = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      callApi<{ passDeleted: boolean }>(supabase, "/pass/student-status", {}),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: studentKey(user?.id ?? "") }),
  });
};
