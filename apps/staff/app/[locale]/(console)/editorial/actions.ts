"use server";

import { z } from "zod";
import {
  ActionFailure,
  affected,
  check,
  staffAction,
} from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";
import { slugify } from "@/lib/admin/catalog-import";
import {
  checkbox,
  dateTime,
  optionalDateTime,
  optionalInt,
  optionalStoragePath,
  optionalText,
  optionalUuid,
  slug,
  text,
  uuid,
} from "@/lib/admin/forms";
import { type PublishMode, publishedAtFor } from "@/lib/admin/publishing";
import { postSections } from "./_components/sections";

const publishMode = z.enum(["draft", "now", "schedule"]);

/** The stored publish date for a form's mode, or an "invalid" error. */
const resolvePublishedAt = (
  mode: PublishMode,
  current: string | null,
  scheduledAt: string | null
) => {
  const value = publishedAtFor(mode, { current, scheduledAt });
  if (value === undefined) {
    throw new ActionFailure("invalid");
  }
  return value;
};

// ── Posts ───────────────────────────────────────────────────────────────────

const postSchema = z.object({
  bodyAr: z.string().max(100_000).default(""),
  bodyEn: z.string().max(100_000).default(""),
  byline: optionalText(120),
  coverImage: optionalStoragePath,
  excerptAr: optionalText(500),
  excerptEn: optionalText(500),
  id: optionalUuid,
  mode: publishMode,
  publishAt: optionalDateTime,
  section: z.enum(postSections),
  slug,
  titleAr: text(200),
  titleEn: text(200),
});

export const savePost = staffAction(
  "editorial",
  postSchema,
  async ({ input, supabase }) => {
    let current: string | null = null;
    if (input.id) {
      const { data } = await supabase
        .from("posts")
        .select("published_at")
        .eq("id", input.id)
        .maybeSingle();
      current = data?.published_at ?? null;
    }
    const row = {
      body_ar: input.bodyAr,
      body_en: input.bodyEn,
      byline: input.byline,
      cover_image: input.coverImage,
      excerpt_ar: input.excerptAr,
      excerpt_en: input.excerptEn,
      published_at: resolvePublishedAt(input.mode, current, input.publishAt),
      section: input.section,
      slug: input.slug,
      title_ar: input.titleAr,
      title_en: input.titleEn,
    };
    if (input.id) {
      affected(
        await supabase.from("posts").update(row).eq("id", input.id).select("id")
      );
      return success();
    }
    const { data } = check(
      await supabase.from("posts").insert(row).select("id").single()
    );
    return success("saved", { redirectTo: `/editorial/posts/${data?.id}` });
  }
);

export const setPostPublished = staffAction(
  "editorial",
  z.object({ id: uuid, publish: checkbox }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("posts")
        .update({
          published_at: input.publish ? new Date().toISOString() : null,
        })
        .eq("id", input.id)
        .select("id")
    );
  }
);

export const deletePost = staffAction(
  "editorial",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.from("posts").delete().eq("id", input.id));
    return success("deleted", { redirectTo: "/editorial" });
  }
);

// ── Events ──────────────────────────────────────────────────────────────────

const eventSchema = z
  .object({
    capacity: optionalInt(1, 1_000_000),
    coverImage: optionalStoragePath,
    descriptionAr: optionalText(10_000),
    descriptionEn: optionalText(10_000),
    endsAt: optionalDateTime,
    id: optionalUuid,
    location: text(300),
    published: checkbox,
    slug,
    startsAt: dateTime,
    titleAr: text(200),
    titleEn: text(200),
  })
  .refine(
    (event) =>
      !event.endsAt || new Date(event.endsAt) > new Date(event.startsAt),
    { path: ["endsAt"] }
  );

export const saveEvent = staffAction(
  "editorial",
  eventSchema,
  async ({ input, supabase }) => {
    const row = {
      capacity: input.capacity,
      cover_image: input.coverImage,
      description_ar: input.descriptionAr,
      description_en: input.descriptionEn,
      ends_at: input.endsAt,
      location: input.location,
      published: input.published,
      slug: input.slug,
      starts_at: input.startsAt,
      title_ar: input.titleAr,
      title_en: input.titleEn,
    };
    if (input.id) {
      affected(
        await supabase
          .from("events")
          .update(row)
          .eq("id", input.id)
          .select("id")
      );
      return success();
    }
    const { data } = check(
      await supabase.from("events").insert(row).select("id").single()
    );
    return success("saved", { redirectTo: `/editorial/events/${data?.id}` });
  }
);

export const deleteEvent = staffAction(
  "editorial",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.from("events").delete().eq("id", input.id));
    return success("deleted", { redirectTo: "/editorial/events" });
  }
);

export const removeRsvp = staffAction(
  "editorial",
  z.object({ eventId: uuid, userId: uuid }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("event_rsvps")
        .delete()
        .eq("event_id", input.eventId)
        .eq("user_id", input.userId)
        .select("event_id")
    );
    return success("deleted");
  }
);

/** Checks a member in at the door; the database pays the 10-Bulb bonus once. */
export const checkInRsvp = staffAction(
  "editorial",
  z.object({ eventId: uuid, userId: uuid }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("check_in_rsvp", {
        event: input.eventId,
        member: input.userId,
      })
    );
    return success();
  }
);

// ── Submissions ─────────────────────────────────────────────────────────────

export const assignSubmission = staffAction(
  "editorial",
  z.object({ assignee: optionalUuid, id: uuid }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("submissions")
        .update({ assigned_to: input.assignee })
        .eq("id", input.id)
        .select("id")
    );
  }
);

const score = z
  .string()
  .optional()
  .transform((value) => (value ? Number(value) : null))
  .pipe(z.union([z.null(), z.literal(0), z.literal(10), z.literal(20)]));

const reviewSchema = z.object({
  archiveWorthy: z
    .enum(["", "yes", "no"])
    .optional()
    .transform((value) => (value ? value === "yes" : null)),
  formatting: z
    .enum(["", "pass", "fail", "disqualified"])
    .optional()
    .transform((value) => value || null),
  id: uuid,
  notes: optionalText(10_000),
  originality: score,
  technical: score,
  thematic: score,
});

/** The editors' rubric (staff-only table, never shown to the author). */
export const saveReview = staffAction(
  "editorial",
  reviewSchema,
  async ({ input, staff, supabase }) => {
    check(
      await supabase.from("submission_reviews").upsert({
        archive_worthy: input.archiveWorthy,
        formatting: input.formatting,
        notes: input.notes,
        originality: input.originality,
        reviewed_by: staff.userId,
        submission_id: input.id,
        technical: input.technical,
        thematic: input.thematic,
      })
    );
  }
);

/** Moves a submission and records the note shown to the author. */
export const decideSubmission = staffAction(
  "editorial",
  z.object({
    decisionNote: optionalText(5000),
    id: uuid,
    status: z.enum([
      "pending",
      "under_review",
      "revisions_requested",
      "accepted",
      "rejected",
    ]),
  }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("submissions")
        .update({ decision_note: input.decisionNote, status: input.status })
        .eq("id", input.id)
        .neq("status", "withdrawn")
        .select("id")
    );
  }
);

/**
 * Publishes an accepted submission in The IDEA Club: a draft in Members'
 * work with the member's name as the byline, opened in the post editor for
 * the editors to translate, shape and schedule.
 */
export const publishSubmission = staffAction(
  "editorial",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    const { data: submission } = check(
      await supabase
        .from("submissions")
        .select("id, title, body, status")
        .eq("id", input.id)
        .maybeSingle()
    );
    if (!submission) {
      throw new ActionFailure("notFound");
    }
    if (submission.status !== "accepted") {
      throw new ActionFailure("transition");
    }
    // The author's name is revealed to editors once a decision is made.
    const { data: queue } = check(await supabase.rpc("review_queue"));
    const author = queue?.find((row) => row.id === input.id)?.author_name;
    const base = slugify(submission.title) || "members-work";
    const { data } = check(
      await supabase
        .from("posts")
        .insert({
          body_ar: submission.body ?? "",
          body_en: submission.body ?? "",
          byline: author?.trim() || null,
          section: "stories",
          slug: `${base.slice(0, 100)}-${input.id.slice(0, 8)}`,
          submission_id: input.id,
          title_ar: submission.title.slice(0, 200),
          title_en: submission.title.slice(0, 200),
        })
        .select("id")
        .single()
    );
    return success("saved", { redirectTo: `/editorial/posts/${data?.id}` });
  }
);
