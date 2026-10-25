"use client";

import { useAuth } from "@repo/auth/provider";
import type { Enums } from "@repo/database";
import { getCandidateCvUrl } from "@repo/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireUserId, unwrap } from "./queries";

/**
 * The IDEA Suite hiring for the active company, through RLS: every member
 * sees its jobs and the candidates The IDEA proposes; owners and admins post
 * jobs and shortlist, reject or hire.
 */

const keys = {
  job: (jobId: string) => ["job-request", jobId] as const,
  jobs: (organizationId: string) => ["job-requests", organizationId] as const,
};

export const useJobRequests = (organizationId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("job_requests")
          .select(
            "id, number, title, status, location, openings, created_at, candidates (status)"
          )
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(100)
      ),
    queryKey: keys.jobs(organizationId),
  });
};

export const useJobRequest = (jobId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("job_requests")
          .select("*, candidates (*)")
          .eq("id", jobId)
          .maybeSingle()
      ),
    queryKey: keys.job(jobId),
  });
};

export interface NewJob {
  description: string;
  employmentType: Enums<"employment_type">;
  location: string;
  openings: number;
  salaryMax: number | null;
  salaryMin: number | null;
  title: string;
}

export const useCreateJob = (organizationId: string) => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewJob) =>
      unwrap(
        await supabase
          .from("job_requests")
          .insert({
            created_by: requireUserId(user?.id),
            description: input.description.trim() || null,
            employment_type: input.employmentType,
            location: input.location.trim() || null,
            openings: input.openings,
            organization_id: organizationId,
            salary_max: input.salaryMax,
            salary_min: input.salaryMin,
            title: input.title.trim(),
          })
          .select("id")
          .single()
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: keys.jobs(organizationId) }),
  });
};

const useRefreshJob = (organizationId: string, jobId: string) => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.job(jobId) }),
      queryClient.invalidateQueries({ queryKey: keys.jobs(organizationId) }),
    ]);
};

export const useDecideCandidate = (organizationId: string, jobId: string) => {
  const { supabase } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      candidate: string;
      decision: "hired" | "rejected" | "shortlisted";
      note?: string;
    }) => {
      unwrap(
        await supabase.rpc("decide_candidate", {
          candidate: input.candidate,
          decision: input.decision,
          note: input.note?.trim() || undefined,
        })
      );
    },
    onSettled: useRefreshJob(organizationId, jobId),
  });
};

export const useCloseJob = (organizationId: string, jobId: string) => {
  const { supabase } = useAuth();
  return useMutation({
    mutationFn: async () => {
      unwrap(await supabase.rpc("close_job_request", { job: jobId }));
    },
    onSettled: useRefreshJob(organizationId, jobId),
  });
};

/** Opens a candidate's CV (a short-lived signed link). */
export const useOpenCv = () => {
  const { supabase } = useAuth();
  return useMutation({
    mutationFn: async (path: string) => {
      const url = await getCandidateCvUrl(supabase, path);
      window.location.assign(url);
    },
  });
};
