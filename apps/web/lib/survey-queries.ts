"use client";

import { useAuth } from "@repo/auth/provider";
import type { Json } from "@repo/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireUserId, unwrap } from "./queries";
import type { SurveyAnswers, SurveyQuestion, SurveyResult } from "./surveys";

/**
 * Club surveys: the ones to answer, answering, creating (verified
 * students), the creator's results, credits and reports.
 */

const SURVEY_COLUMNS =
  "id, creator_id, title, description, language, consent, kind, status, wanted, reward, held, order_id, students_only, universities, majors, years, governorates, min_seconds, ethics_reference, flags, review_note, opened_at, closed_at, created_at" as const;

const keys = {
  credits: (userId: string) => ["survey-credits", userId] as const,
  forMe: (userId: string) => ["surveys-for-me", userId] as const,
  mine: (userId: string) => ["my-surveys", userId] as const,
  results: (id: string) => ["survey-results", id] as const,
  survey: (id: string) => ["survey", id] as const,
};

/** Open surveys the member can answer. */
export const useSurveysForMe = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => unwrap(await supabase.rpc("surveys_for_me")) ?? [],
    queryKey: keys.forMe(user?.id ?? ""),
  });
};

/** The member's own surveys, newest first. */
export const useMySurveys = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("surveys")
          .select(`${SURVEY_COLUMNS}, survey_responses (count)`)
          .eq("creator_id", requireUserId(user?.id))
          .order("created_at", { ascending: false })
      ),
    queryKey: keys.mine(user?.id ?? ""),
  });
};

export const useSurveyCredits = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => unwrap(await supabase.rpc("my_survey_credits")) ?? 0,
    queryKey: keys.credits(user?.id ?? ""),
  });
};

/** A survey with its questions in order. */
export const useSurvey = (id: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const survey = unwrap(
        await supabase
          .from("surveys")
          .select(
            `${SURVEY_COLUMNS}, survey_questions (id, position, kind, prompt, options, required, attention_answer)`
          )
          .eq("id", id)
          .maybeSingle()
      );
      if (!survey) {
        return null;
      }
      return {
        ...survey,
        survey_questions: [...survey.survey_questions].sort(
          (a, b) => a.position - b.position
        ) as (SurveyQuestion & { id: string; position: number })[],
      };
    },
    queryKey: keys.survey(id),
  });
};

export interface SurveyDraft {
  consent: string;
  description: string;
  ethics_reference: string;
  governorates: string[];
  id?: string;
  kind: "bulbs" | "cash" | "free";
  language: "ar" | "en";
  majors: string[];
  min_seconds: number;
  questions: SurveyQuestion[];
  students_only: boolean;
  title: string;
  universities: string[];
  wanted: number;
  years: number[];
}

/** Saves the draft, then (optionally) publishes it. */
export const useSaveSurvey = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      draft,
      publish,
    }: {
      draft: SurveyDraft;
      publish: boolean;
    }) => {
      const saved = unwrap(
        await supabase.rpc("save_survey", {
          body: draft as unknown as Json,
        })
      );
      if (!(publish && saved)) {
        return saved;
      }
      return unwrap(await supabase.rpc("publish_survey", { target: saved.id }));
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: keys.mine(user?.id ?? "") }),
  });
};

export const useCloseSurvey = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (target: string) =>
      unwrap(await supabase.rpc("close_survey", { target })),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: keys.mine(user?.id ?? "") }),
  });
};

/** Starts the clock (the minimum answer time) when the page opens. */
export const useStartSurvey = () => {
  const { supabase } = useAuth();
  return useMutation({
    mutationFn: async (target: string) =>
      unwrap(await supabase.rpc("start_survey", { target })),
  });
};

export const useSubmitSurvey = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      answers,
      target,
    }: {
      answers: SurveyAnswers;
      target: string;
    }) =>
      unwrap(
        await supabase.rpc("submit_survey", {
          answers: answers as unknown as Json,
          target,
        })
      ),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.forMe(user?.id ?? "") }),
        queryClient.invalidateQueries({
          queryKey: keys.credits(user?.id ?? ""),
        }),
      ]),
  });
};

export const useReportSurvey = () => {
  const { supabase } = useAuth();
  return useMutation({
    mutationFn: async ({
      reason,
      target,
    }: {
      reason: string;
      target: string;
    }) => unwrap(await supabase.rpc("report_survey", { reason, target })),
  });
};

/** The creator's answers (without who gave them). */
export const useSurveyResults = (id: string, enabled: boolean) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled,
    queryFn: async () =>
      (unwrap(await supabase.rpc("survey_results", { target: id })) ??
        []) as unknown as SurveyResult[],
    queryKey: keys.results(id),
  });
};

/** The student's major, year of study and governorate (targeting). */
export const useStudentProfile = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("student_badges")
          .select("major, study_year, governorate")
          .eq("user_id", requireUserId(user?.id))
          .maybeSingle()
      ),
    queryKey: ["student", user?.id ?? "", "profile"],
  });
};

export const useSetStudentProfile = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      governorate: string;
      major: string;
      year: number | null;
    }) =>
      unwrap(
        await supabase.rpc("set_student_profile", {
          governorate: input.governorate,
          major: input.major,
          study_year: input.year as number,
        })
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["student", user?.id ?? ""] }),
  });
};
