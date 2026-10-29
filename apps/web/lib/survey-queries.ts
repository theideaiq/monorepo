"use client";

import { useAuth } from "@repo/auth/provider";
import type { Json } from "@repo/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireUserId, unwrap } from "./queries";
import type {
  QuotaField,
  SurveyAnswers,
  SurveyAudience,
  SurveyKind,
  SurveyPurpose,
  SurveyQuestion,
  SurveyRecord,
  SurveyResult,
  SurveySummary,
} from "./surveys";

/**
 * Club surveys: the ones to answer, answering, creating (verified
 * students), the creator's results, credits and reports.
 */

const SURVEY_COLUMNS =
  "id, creator_id, title, quotas, description, language, consent, kind, status, wanted, reward, held, order_id, students_only, universities, majors, years, governorates, min_seconds, ethics_reference, flags, review_note, opened_at, closes_at, closed_at, created_at, estimated_seconds, median_seconds, reward_pending, paused_at, topup_order_id, refund_amount, refunded_amount, refunded_at, run_by, purpose, share_summary, deception, keep_months, answers_warned_at, answers_deleted_at" as const;

const keys = {
  credits: (userId: string) => ["survey-credits", userId] as const,
  forMe: (userId: string) => ["surveys-for-me", userId] as const,
  mine: (userId: string) => ["my-surveys", userId] as const,
  response: (id: string, userId: string) =>
    ["survey-response", id, userId] as const,
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
            `${SURVEY_COLUMNS}, survey_questions (id, position, kind, prompt, options, required, is_attention)`
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
  /** Shown to respondents after they submit a deception study. */
  debrief: string;
  /** A deception study: needs the ethics reference and a debrief. */
  deception: boolean;
  description: string;
  ethics_reference: string;
  governorates: string[];
  id?: string;
  /** Months the raw answers are kept after closing (over 24 needs an ethics reference). */
  keep_months: number;
  kind: SurveyKind;
  language: "ar" | "en";
  majors: string[];
  min_seconds: number;
  purpose: SurveyPurpose | "";
  questions: SurveyQuestion[];
  /** The largest share (%) of the target from one value of a field. */
  quotas?: Partial<Record<QuotaField, number>>;
  /** Who runs it, shown on the survey. */
  run_by: string;
  /** Respondents see a summary when it closes (academic surveys may turn it off). */
  share_summary: boolean;
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
          .select("major, study_year, governorate, university_email")
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

/** The member's own response to a survey, if they started one. */
export const useMyResponse = (surveyId: string) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("survey_responses")
          .select(
            "id, started_at, submitted_at, counted, excluded_reason, failed_checks, seconds, reward_paid, withdrawn_at, appealed_at, appeal_decided_at, appeal_upheld"
          )
          .eq("survey_id", surveyId)
          .eq("user_id", requireUserId(user?.id))
          .maybeSingle()
      ),
    queryKey: keys.response(surveyId, user?.id ?? ""),
  });
};

/** Quits before submitting, or deletes a submitted response (the reward stays). */
export const useWithdrawResponse = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (target: string) =>
      unwrap(await supabase.rpc("withdraw_survey_response", { target })),
    onSettled: (_data, _error, target) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: keys.response(target, user?.id ?? ""),
        }),
        queryClient.invalidateQueries({ queryKey: keys.forMe(user?.id ?? "") }),
      ]),
  });
};

/** Appeals a response that didn't count, once. */
export const useAppealResponse = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ note, target }: { note: string; target: string }) =>
      unwrap(await supabase.rpc("appeal_survey_response", { note, target })),
    onSettled: (_data, _error, { target }) =>
      queryClient.invalidateQueries({
        queryKey: keys.response(target, user?.id ?? ""),
      }),
  });
};

/** The creator accepts the higher reward the median set: an order of the difference. */
export const useConfirmSurveyReward = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (target: string) =>
      unwrap(await supabase.rpc("confirm_survey_reward", { target })),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: keys.mine(user?.id ?? "") }),
  });
};

/** "Who answered": for the creator, once the survey has opened. */
export const useSurveyAudience = (id: string, enabled: boolean) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled,
    queryFn: async () =>
      unwrap(
        await supabase.rpc("survey_audience", { target: id })
      ) as unknown as SurveyAudience,
    queryKey: ["survey-audience", id] as const,
  });
};

/** Whether the member can answer Boosted surveys: a phone of their own and today's count. */
export const useMySurveyAccess = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(await supabase.rpc("my_survey_access"))?.[0] ?? null,
    queryKey: ["survey-access", user?.id ?? ""] as const,
  });
};

/**
 * For editing a draft: the check questions' expected answers and the
 * debrief, which respondents never read from the survey itself.
 */
export const useDraftPrivate = (id: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const [answers, debrief] = await Promise.all([
        supabase.rpc("survey_attention_answers", { target: id }),
        supabase
          .from("survey_debriefs")
          .select("body")
          .eq("survey_id", id)
          .maybeSingle(),
      ]);
      return {
        attention: new Map(
          (unwrap(answers) ?? []).map((row) => [row.question_id, row.answer])
        ),
        debrief: unwrap(debrief)?.body ?? "",
      };
    },
    queryKey: ["survey-private", id] as const,
  });
};

/** A deception study's debrief, once the member has submitted. */
export const useSurveyDebrief = (id: string, enabled: boolean) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("survey_debriefs")
          .select("body")
          .eq("survey_id", id)
          .maybeSingle()
      )?.body ?? null,
    queryKey: ["survey-debrief", id] as const,
  });
};

/** The results summary of a closed survey the member answered (null when there is none). */
export const useSurveySummary = (id: string, enabled = true) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: enabled && Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("survey_summary", {
        target: id,
      });
      // Not closed, its summary turned off, or not answered: nothing to show.
      if (error?.code === "P0002") {
        return null;
      }
      return unwrap({ data, error }) as unknown as SurveySummary;
    },
    queryKey: ["survey-summary", id] as const,
  });
};

/** The member's counted answers, contributor badge and surveys answered. */
export const useMySurveyRecord = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(await supabase.rpc("my_survey_record")) as unknown as SurveyRecord,
    queryKey: ["survey-record", user?.id ?? ""] as const,
  });
};
