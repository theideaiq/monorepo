"use client";

import { useAuth } from "@repo/auth/provider";
import type { SubmissionType } from "@repo/database";
import { checkFile, removeFiles, uploadSubmissionFile } from "@repo/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isDuplicate } from "./errors";
import { queryKeys, requireUserId, unwrap } from "./queries";

/** Events (RSVPs, calendar feed) and journal submissions. */

const EVENT_COLUMNS =
  "id, slug, title_ar, title_en, description_ar, description_en, location, starts_at, ends_at, capacity, cover_image" as const;

/** Published events that haven't started yet, soonest first. */
export const useUpcomingEvents = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("events")
          .select(EVENT_COLUMNS)
          .eq("published", true)
          .gte("starts_at", new Date().toISOString())
          .order("starts_at")
          .limit(50)
      ),
    queryKey: queryKeys.events,
  });
};

/** The events the user RSVP'd to (ids), with the event for the dashboard. */
export const useMyRsvps = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("event_rsvps")
          .select(
            "event_id, created_at, event:events (id, slug, title_ar, title_en, location, starts_at)"
          )
          .eq("user_id", requireUserId(user?.id))
      ),
    queryKey: queryKeys.myRsvps(user?.id ?? ""),
  });
};

/** Upcoming RSVP'd events, soonest first. */
export const upcomingRsvps = <
  T extends { event: { starts_at: string } | null },
>(
  rsvps: readonly T[],
  now = new Date()
) =>
  rsvps
    .filter(
      (rsvp): rsvp is T & { event: NonNullable<T["event"]> } =>
        rsvp.event !== null && new Date(rsvp.event.starts_at) > now
    )
    .sort(
      (a, b) =>
        new Date(a.event.starts_at).getTime() -
        new Date(b.event.starts_at).getTime()
    );

export const useRsvpCount = (eventId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      Number(
        unwrap(await supabase.rpc("event_rsvp_count", { event: eventId }))
      ),
    queryKey: queryKeys.rsvpCount(eventId),
  });
};

/**
 * When the member can RSVP (Plus members 48 hours before everyone) and how
 * many seats they can still take (null: unlimited); `event_rsvp_window`.
 */
export const useRsvpWindow = (eventId: string) => {
  const { supabase, user } = useAuth();
  return useQuery({
    queryFn: async () => {
      const row =
        unwrap(
          await supabase
            .rpc("event_rsvp_window", { event: eventId })
            .maybeSingle()
        ) ?? null;
      return row
        ? {
            opensAt: row.opens_at as string | null,
            plusOpensAt: row.plus_opens_at as string | null,
            seatsLeft: row.seats_left as number | null,
          }
        : null;
    },
    queryKey: [...queryKeys.rsvpCount(eventId), "window", user?.id ?? ""],
  });
};

/** RSVPs for the user or cancels one (`going: false`). */
export const useRsvp = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      going,
    }: {
      eventId: string;
      going: boolean;
    }) => {
      const userId = requireUserId(user?.id);
      if (going) {
        const { error } = await supabase
          .from("event_rsvps")
          .insert({ event_id: eventId, user_id: userId });
        // Already going (another tab or device): nothing to do.
        if (error && !isDuplicate(error)) {
          throw error;
        }
        return;
      }
      unwrap(
        await supabase
          .from("event_rsvps")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", userId)
      );
    },
    onSettled: (_data, _error, { eventId }) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.myRsvps(user?.id ?? ""),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.rsvpCount(eventId),
        }),
      ]),
  });
};

const TRAILING_SLASH = /\/$/;
const HTTP_SCHEME = /^https?:/;

/** The personal calendar feed served by apps/api. */
export const calendarFeedUrl = (apiUrl: string, token: string) =>
  `${apiUrl.replace(TRAILING_SLASH, "")}/calendar/${token}.ics`;

/** The same feed as webcal://, which calendar apps open as a subscription. */
export const webcalUrl = (feedUrl: string) =>
  feedUrl.replace(HTTP_SCHEME, "webcal:");

export const useCalendarToken = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => unwrap(await supabase.rpc("my_calendar_token")),
    queryKey: queryKeys.calendarToken(user?.id ?? ""),
    staleTime: Number.POSITIVE_INFINITY,
  });
};

export const useRotateCalendarToken = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await supabase.rpc("rotate_calendar_token")),
    onSuccess: (token) =>
      queryClient.setQueryData(queryKeys.calendarToken(user?.id ?? ""), token),
  });
};

// ── Submissions ──────────────────────────────────────────────────────────────

export const submissionTypes = [
  "essay",
  "poetry",
  "fiction",
  "theatre",
  "visual_art",
  "other",
] as const satisfies readonly SubmissionType[];

/** Images accepted for visual art; PDFs too for written work. */
export const IMAGE_TYPES = ["image/jpeg", "image/png"] as const;
export const FILE_TYPES = [...IMAGE_TYPES, "application/pdf"] as const;

export interface SubmissionDraft {
  body: string;
  file: File | null;
  format: "file" | "text";
  title: string;
  type: SubmissionType;
}

export type SubmissionProblem =
  | "body"
  | "fileMissing"
  | "fileTooLarge"
  | "fileType"
  | "imageRequired"
  | "title";

/** Mirrors the table's checks: visual art needs an image file. */
export const validateSubmission = (
  draft: SubmissionDraft
): SubmissionProblem | null => {
  if (!draft.title.trim()) {
    return "title";
  }
  const needsFile = draft.type === "visual_art" || draft.format === "file";
  if (!needsFile) {
    return draft.body.trim() ? null : "body";
  }
  if (!draft.file) {
    return draft.type === "visual_art" ? "imageRequired" : "fileMissing";
  }
  if (
    draft.type === "visual_art" &&
    !(IMAGE_TYPES as readonly string[]).includes(draft.file.type)
  ) {
    return "imageRequired";
  }
  switch (checkFile("submissions", draft.file)) {
    case null:
      return null;
    case "too_large":
      return "fileTooLarge";
    case "empty":
      return "fileMissing";
    default:
      return "fileType";
  }
};

export const useMySubmissions = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("submissions")
          .select(
            "id, title, type, status, decision_note, file_path, submitted_at, decided_at"
          )
          .eq("author_id", requireUserId(user?.id))
          .order("submitted_at", { ascending: false })
      ),
    queryKey: queryKeys.submissions(user?.id ?? ""),
  });
};

/** Uploads the file (if any), then records the submission. */
export const useSubmitWork = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draft: SubmissionDraft) => {
      const userId = requireUserId(user?.id);
      const withFile = draft.type === "visual_art" || draft.format === "file";
      const stored =
        withFile && draft.file
          ? await uploadSubmissionFile(supabase, userId, draft.file)
          : null;

      const { error } = await supabase.from("submissions").insert({
        author_id: userId,
        body: withFile ? null : draft.body.trim(),
        file_path: stored?.path ?? null,
        title: draft.title.trim(),
        type: draft.type,
      });
      if (error) {
        if (stored) {
          await removeFiles(supabase, "submissions", [stored.path]).catch(
            () => undefined
          );
        }
        throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.submissions(user?.id ?? ""),
      }),
  });
};

/** Authors may withdraw work that is waiting or awaiting revisions. */
export const canWithdraw = (status: string) =>
  status === "pending" || status === "revisions_requested";

export const useWithdrawSubmission = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (submissionId: string) => {
      const rows = unwrap(
        await supabase
          .from("submissions")
          .update({ status: "withdrawn" })
          .eq("id", submissionId)
          .select("id")
      );
      if (!rows?.length) {
        throw new Error("Submission can no longer be withdrawn");
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.submissions(user?.id ?? ""),
      }),
  });
};
