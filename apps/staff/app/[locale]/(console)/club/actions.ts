"use server";

import { Constants } from "@repo/database";
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
  countryCodes,
  dateTime,
  int,
  optionalDate,
  optionalDateTime,
  optionalInt,
  optionalStoragePath,
  optionalText,
  optionalUuid,
  slug,
  text,
  uuid,
} from "@/lib/admin/forms";
import {
  costsOf,
  itineraryOf,
  MAX_COST_LINES,
  MAX_ITINERARY_STEPS,
  validCosts,
  validItinerary,
} from "@/lib/admin/program-package";
import { type PublishMode, publishedAtFor } from "@/lib/admin/publishing";
import type { ServerClient } from "@/lib/admin/session";
import { postTopics } from "./_components/topics";

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
  slug,
  titleAr: text(200),
  titleEn: text(200),
  topics: z.array(z.enum(postTopics)).min(1).max(5),
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
      slug: input.slug,
      title_ar: input.titleAr,
      title_en: input.titleEn,
      topics: input.topics,
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
    return success("saved", { redirectTo: `/club/posts/${data?.id}` });
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
    return success("deleted", { redirectTo: "/club" });
  }
);

// ── Events ──────────────────────────────────────────────────────────────────

const eventSchema = z
  .object({
    /** Seats held for Plus Blaze members until a day before the start. */
    blazeSeats: optionalInt(0, 1_000_000),
    capacity: optionalInt(1, 1_000_000),
    coverImage: optionalStoragePath,
    descriptionAr: optionalText(10_000),
    descriptionEn: optionalText(10_000),
    endsAt: optionalDateTime,
    id: optionalUuid,
    location: text(300),
    published: checkbox,
    /** When RSVPs open to everyone (Plus 48 hours before); empty: 48 hours after publishing. */
    rsvpOpensAt: optionalDateTime,
    slug,
    startsAt: dateTime,
    titleAr: text(200),
    titleEn: text(200),
  })
  .refine(
    (event) =>
      !event.endsAt || new Date(event.endsAt) > new Date(event.startsAt),
    { path: ["endsAt"] }
  )
  .refine(
    (event) =>
      event.capacity === null ||
      event.capacity === undefined ||
      (event.blazeSeats ?? 0) <= event.capacity,
    { path: ["blazeSeats"] }
  );

export const saveEvent = staffAction(
  "editorial",
  eventSchema,
  async ({ input, supabase }) => {
    const row = {
      blaze_seats: input.blazeSeats ?? 0,
      capacity: input.capacity,
      cover_image: input.coverImage,
      description_ar: input.descriptionAr,
      description_en: input.descriptionEn,
      ends_at: input.endsAt,
      location: input.location,
      published: input.published,
      rsvp_opens_at: input.rsvpOpensAt,
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
    return success("saved", { redirectTo: `/club/events/${data?.id}` });
  }
);

export const deleteEvent = staffAction(
  "editorial",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.from("events").delete().eq("id", input.id));
    return success("deleted", { redirectTo: "/club/events" });
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
          slug: `${base.slice(0, 100)}-${input.id.slice(0, 8)}`,
          submission_id: input.id,
          title_ar: submission.title.slice(0, 200),
          title_en: submission.title.slice(0, 200),
          topics: ["stories"],
        })
        .select("id")
        .single()
    );
    return success("saved", { redirectTo: `/club/posts/${data?.id}` });
  }
);

// ── Opportunities ──────────────────────────────────────────────────────────

const opportunityKinds = [
  "job",
  "internship",
  "scholarship",
  "competition",
  "program",
] as const;

const optionalHttpsUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => value || null)
  .pipe(z.union([z.null(), z.url().startsWith("https://")]));

const { Enums } = Constants.public;

/** A new one's unclaimed organization (an existing one, or a new name). */
const hostFields = {
  hostId: optionalUuid,
  hostName: optionalText(120),
};

const opportunitySchema = z
  .object({
    applicantFee: optionalInt(0, 1_000_000_000),
    applyUrl: optionalHttpsUrl,
    countries: countryCodes,
    coverImage: optionalStoragePath,
    deadline: optionalDateTime,
    descriptionAr: optionalText(10_000),
    descriptionEn: optionalText(10_000),
    eligibility: z
      .enum(Enums.opportunity_eligibility)
      .or(z.literal(""))
      .optional()
      .transform((value) => value || null),
    endsOn: optionalDate,
    feeNote: optionalText(300),
    funding: z.enum(Enums.opportunity_funding).default("unknown"),
    ...hostFields,
    id: optionalUuid,
    kind: z.enum(opportunityKinds),
    lastChecked: optionalDate,
    levels: z.array(z.enum(Enums.opportunity_level)).max(6).default([]),
    /** The IDEA's own only: listed straight away, or kept as a draft. */
    listed: checkbox,
    location: optionalText(160),
    maxAge: optionalInt(1, 99),
    minAge: optionalInt(1, 99),
    opensAt: optionalDateTime,
    remote: checkbox,
    sourceUrl: optionalHttpsUrl,
    startsOn: optionalDate,
    summaryAr: optionalText(300),
    summaryEn: optionalText(300),
    titleAr: text(160),
    titleEn: text(160),
  })
  .refine((row) => row.remote || row.location, { path: ["location"] })
  .refine(
    (row) =>
      !(row.opensAt && row.deadline) ||
      new Date(row.opensAt) < new Date(row.deadline),
    { path: ["deadline"] }
  )
  .refine(
    (row) => !(row.startsOn && row.endsOn) || row.startsOn <= row.endsOn,
    { path: ["endsOn"] }
  )
  .refine(
    (row) =>
      row.minAge === null || row.maxAge === null || row.minAge <= row.maxAge,
    { path: ["maxAge"] }
  );

/** The organizations nobody has claimed: editors list and review for them. */
const unclaimedIds = async (supabase: ServerClient) =>
  new Set(
    (check(await supabase.rpc("unclaimed_organizations")).data ?? []).map(
      (organization) => organization.id
    )
  );

/**
 * Saves an opportunity. New ones are The IDEA's own or an unclaimed
 * organization's (listed or a draft); a claimed organization's keep their
 * review status when editors correct them.
 */
export const saveOpportunity = staffAction(
  "editorial",
  opportunitySchema,
  async ({ input, supabase }) => {
    const row = {
      applicant_fee: input.applicantFee ?? 0,
      apply_url: input.applyUrl,
      cover_image: input.coverImage,
      deadline: input.deadline,
      description_ar: input.descriptionAr,
      description_en: input.descriptionEn,
      destination_countries: input.countries,
      ends_on: input.endsOn,
      fee_note: input.feeNote,
      funding_type: input.funding,
      iraqi_eligibility: input.eligibility,
      kind: input.kind,
      last_checked_on: input.lastChecked,
      levels: input.levels,
      location: input.location,
      max_age: input.maxAge,
      min_age: input.minAge,
      opens_at: input.opensAt,
      remote: input.remote,
      source_url: input.sourceUrl,
      starts_on: input.startsOn,
      summary_ar: input.summaryAr,
      summary_en: input.summaryEn,
      title_ar: input.titleAr,
      title_en: input.titleEn,
    };
    const status = input.listed ? "approved" : "draft";
    if (input.id) {
      const { data: current } = check(
        await supabase
          .from("opportunities")
          .select("organization_id")
          .eq("id", input.id)
          .single()
      );
      const reviewed =
        current?.organization_id &&
        !(await unclaimedIds(supabase)).has(current.organization_id);
      affected(
        await supabase
          .from("opportunities")
          .update(reviewed ? row : { ...row, status })
          .eq("id", input.id)
          .select("id")
      );
      return success();
    }
    let organizationId = input.hostId;
    if (input.hostName) {
      organizationId = check(
        await supabase.rpc("create_unclaimed_organization", {
          org_name: input.hostName,
        })
      ).data;
    } else if (
      organizationId &&
      !(await unclaimedIds(supabase)).has(organizationId)
    ) {
      throw new ActionFailure("invalid");
    }
    const { data } = check(
      await supabase
        .from("opportunities")
        // The database makes the slug from the title, and the host from
        // the organization.
        .insert({ ...row, organization_id: organizationId, slug: "", status })
        .select("id")
        .single()
    );
    return success("saved", {
      redirectTo: `/club/opportunities/${data?.id}`,
    });
  }
);

/** Hands an unclaimed organization over to the Pass with this email. */
export const claimOrganization = staffAction(
  "editorial",
  z.object({ email: z.email().max(320), organization: uuid }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("claim_organization", {
        organization: input.organization,
        owner_email: input.email,
      })
    );
    return success("saved");
  }
);

/** Approve, ask for changes or refuse an organization's opportunity. */
export const reviewOpportunity = staffAction(
  "editorial",
  z
    .object({
      decision: z.enum(["approved", "changes", "rejected"]),
      id: uuid,
      note: optionalText(1000),
    })
    .refine((row) => row.decision === "approved" || row.note, {
      path: ["note"],
    }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("review_opportunity", {
        decision: input.decision,
        note: input.note ?? undefined,
        opportunity: input.id,
      })
    );
    return success("saved");
  }
);

/** Features an opportunity until a date (the paid extra), or stops it. */
export const featureOpportunity = staffAction(
  "editorial",
  z.object({ id: uuid, until: optionalDateTime }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("opportunities")
        .update({ featured_until: input.until })
        .eq("id", input.id)
        .select("id")
    );
    return success("saved");
  }
);

/** Closes a listed opportunity early. */
export const closeOpportunity = staffAction(
  "editorial",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("opportunities")
        .update({ status: "closed" })
        .eq("id", input.id)
        .select("id")
    );
    return success("saved");
  }
);

export const deleteOpportunity = staffAction(
  "editorial",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.from("opportunities").delete().eq("id", input.id));
    return success("deleted", { redirectTo: "/club/opportunities" });
  }
);

// ── The IDEA's paid programs ───────────────────────────────────────────────

const rows = z.array(z.string().trim().max(20)).max(6).default([]);
/** Repeated text fields (`key[]`), up to `count` rows of `max` characters. */
const textRows = (count: number, max: number) =>
  z.array(z.string().max(max)).max(count).default([]);
const stepRows = (max: number) => textRows(MAX_ITINERARY_STEPS, max);
const costRows = (max: number) => textRows(MAX_COST_LINES, max);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const WHOLE = /^\d+$/;

/** The installment rows filled in: shares of 100%, the later ones dated. */
const installmentsOf = (percents: string[], dates: string[]) =>
  percents.flatMap((percent, index) =>
    percent
      ? [
          index === 0
            ? { percent: Number(percent) }
            : { due_on: dates[index] ?? "", percent: Number(percent) },
        ]
      : []
  );

/** The refund rows filled in, furthest from the start first. */
const refundScheduleOf = (days: string[], percents: string[]) =>
  days
    .flatMap((day, index) =>
      day && percents[index]
        ? [{ days_before: Number(day), percent: Number(percents[index]) }]
        : []
    )
    .sort((a, b) => b.days_before - a.days_before);

const itineraryOfRow = (row: {
  itineraryDay: string[];
  itineraryDetailAr: string[];
  itineraryDetailEn: string[];
  itineraryTitleAr: string[];
  itineraryTitleEn: string[];
}) =>
  itineraryOf({
    day: row.itineraryDay,
    detailAr: row.itineraryDetailAr,
    detailEn: row.itineraryDetailEn,
    titleAr: row.itineraryTitleAr,
    titleEn: row.itineraryTitleEn,
  });

const costsOfRow = (row: {
  costAmount: string[];
  costIncluded: string[];
  costLabelAr: string[];
  costLabelEn: string[];
}) =>
  costsOf({
    amount: row.costAmount,
    included: row.costIncluded,
    labelAr: row.costLabelAr,
    labelEn: row.costLabelEn,
  });

const programSchema = z
  .object({
    chaperone: checkbox,
    costAmount: costRows(30),
    costIncluded: costRows(5),
    costLabelAr: costRows(250),
    costLabelEn: costRows(250),
    id: uuid,
    includesAr: optionalText(2000),
    includesEn: optionalText(2000),
    installmentDue: rows,
    installmentPercent: rows,
    insurance: checkbox,
    itineraryDay: stepRows(10),
    itineraryDetailAr: stepRows(1200),
    itineraryDetailEn: stepRows(1200),
    itineraryTitleAr: stepRows(250),
    itineraryTitleEn: stepRows(250),
    maxAge: optionalInt(13, 99),
    minAge: int(13, 99),
    passportRequired: checkbox,
    payWithinDays: int(1, 30),
    plusPrice: optionalInt(0, 1_000_000_000),
    price: int(0, 1_000_000_000),
    refundDays: rows,
    refundPercent: rows,
    seats: optionalInt(1, 1000),
    travel: checkbox,
    visaRefundRate: int(0, 100),
  })
  .refine((row) => row.price % 250 === 0, { path: ["price"] })
  .refine(
    (row) =>
      row.plusPrice === null ||
      (row.plusPrice % 250 === 0 && row.plusPrice < row.price),
    { path: ["plusPrice"] }
  )
  .refine((row) => row.maxAge === null || row.maxAge >= row.minAge, {
    path: ["maxAge"],
  })
  .refine((row) => !row.travel || row.insurance, { path: ["insurance"] })
  .refine((row) => row.minAge >= 18 || row.chaperone, { path: ["chaperone"] })
  .refine(
    (row) => {
      const steps = installmentsOf(row.installmentPercent, row.installmentDue);
      const dates = steps.slice(1).map((step) => step.due_on ?? "");
      return (
        steps.length > 0 &&
        steps.every(
          (step) =>
            Number.isInteger(step.percent) &&
            step.percent >= 1 &&
            step.percent <= 100
        ) &&
        steps.reduce((sum, step) => sum + step.percent, 0) === 100 &&
        dates.every(
          (day, index) =>
            DAY.test(day) && (index === 0 || day > dates[index - 1])
        )
      );
    },
    { path: ["installmentPercent"] }
  )
  .refine(
    (row) =>
      [...row.refundDays, ...row.refundPercent].every(
        (value) => !value || WHOLE.test(value)
      ) &&
      refundScheduleOf(row.refundDays, row.refundPercent).every(
        (step, index, all) =>
          step.days_before <= 365 &&
          step.percent <= 100 &&
          (index === 0 ||
            (step.days_before < all[index - 1].days_before &&
              step.percent <= all[index - 1].percent))
      ),
    { path: ["refundDays"] }
  )
  .refine((row) => validItinerary(itineraryOfRow(row)), {
    path: ["itineraryTitleEn"],
  })
  .refine((row) => validCosts(costsOfRow(row)), { path: ["costLabelEn"] });

/** Sells one of The IDEA's program opportunities as a package. */
export const saveProgram = staffAction(
  "editorial",
  programSchema,
  async ({ input, supabase }) => {
    check(
      await supabase.from("programs").upsert({
        chaperone: input.chaperone,
        // Plain objects, as the JSON columns take them.
        costs: costsOfRow(input).map((line) => ({ ...line })),
        includes_ar: input.includesAr,
        includes_en: input.includesEn,
        installments: installmentsOf(
          input.installmentPercent,
          input.installmentDue
        ),
        insurance: input.insurance,
        itinerary: itineraryOfRow(input).map((step) => ({ ...step })),
        max_age: input.maxAge,
        min_age: input.minAge,
        opportunity_id: input.id,
        passport_required: input.passportRequired,
        pay_within_days: input.payWithinDays,
        plus_price: input.plusPrice,
        price: input.price,
        refund_schedule: refundScheduleOf(
          input.refundDays,
          input.refundPercent
        ),
        seats: input.seats,
        travel: input.travel,
        visa_refund_rate: input.visaRefundRate,
      })
    );
    return success("saved");
  }
);

/** Accept (within the seats), waitlist or refuse an application. */
export const reviewApplication = staffAction(
  "editorial",
  z.object({
    decision: z.enum(["accepted", "waitlisted", "refused"]),
    id: uuid,
    note: optionalText(1000),
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("review_program_application", {
        application: input.id,
        decision: input.decision,
        note: input.note ?? undefined,
      })
    );
    return success("saved");
  }
);

/**
 * Ends a place: the program done, a refused visa, unpaid by its date or
 * called off by The IDEA; the refund follows the program's rules.
 */
export const endApplication = staffAction(
  "editorial",
  z.object({
    id: uuid,
    outcome: z.enum(["completed", "visa_refused", "unpaid", "the_idea"]),
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("end_program_application", {
        application: input.id,
        outcome: input.outcome,
      })
    );
    return success("saved");
  }
);
