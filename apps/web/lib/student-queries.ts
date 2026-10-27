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
