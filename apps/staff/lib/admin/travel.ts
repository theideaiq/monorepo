import { Constants } from "@repo/database";
import type { Locale } from "@repo/internationalization";
import { z } from "zod";
import {
  checkbox,
  date,
  optionalDate,
  optionalInt,
  optionalText,
  optionalUuid,
  text,
  uuid,
} from "./forms";

/**
 * The Travel Kit's templates (migration 20270327000000): a route is a
 * country and a visa type; its requirements are documents, tasks and open
 * questions, each with a source link, how sure it is and the day it was
 * checked. A program's extras are requirements of its opportunity. Editors
 * enter all of it; nothing here fills anything in.
 */

export const routeStatuses = ["draft", "published", "retired"] as const;
export type RouteStatus = (typeof routeStatuses)[number];

export const travelKinds = Constants.public.Enums.travel_item_kind;
export const travelConfidences = Constants.public.Enums.travel_confidence;
export const travelAnchors = ["appointment", "departure"] as const;

const ROUTE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COUNTRY = /^[A-Z]{2}$/;
const DOC_KEY = /^[a-z0-9_]{2,40}$/;
const HTTP_URL = /^https?:\/\//;

export const routeSchema = z.object({
  applyAtAr: optionalText(1000),
  applyAtEn: optionalText(1000),
  askAr: optionalText(500),
  askEn: optionalText(500),
  checkedOn: optionalDate,
  /** ISO 3166-1 alpha-2. */
  country: z.string().trim().toUpperCase().regex(COUNTRY),
  id: optionalUuid,
  noteAr: optionalText(2000),
  noteEn: optionalText(2000),
  slug: z.string().trim().toLowerCase().max(80).regex(ROUTE_SLUG),
  status: z.enum(routeStatuses),
  visaAr: text(200),
  visaEn: text(200),
});

export type RouteInput = z.output<typeof routeSchema>;

/** A route is published only once someone has checked it (as the database). */
export const routeNeedsCheck = (route: {
  checkedOn: string | null;
  status: RouteStatus;
}) => route.status === "published" && !route.checkedOn;

/** The route's columns from the form. */
export const routeRow = (input: RouteInput) => ({
  apply_at_ar: input.applyAtAr,
  apply_at_en: input.applyAtEn,
  ask_ar: input.askAr,
  ask_en: input.askEn,
  checked_on: input.checkedOn,
  country: input.country,
  note_ar: input.noteAr,
  note_en: input.noteEn,
  slug: input.slug,
  status: input.status,
  visa_ar: input.visaAr,
  visa_en: input.visaEn,
});

const optionalDocKey = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((value) => value || null)
  .pipe(z.union([z.null(), z.string().regex(DOC_KEY)]));

const sourceUrl = z.string().trim().max(1000).regex(HTTP_URL).pipe(z.url());

export const requirementSchema = z
  .object({
    anchor: z
      .enum(["", ...travelAnchors])
      .optional()
      .transform((value) => value || null),
    checkedOn: date,
    confidence: z.enum(travelConfidences),
    copies: optionalInt(0, 20),
    detailAr: optionalText(2000),
    detailEn: optionalText(2000),
    docKey: optionalDocKey,
    id: optionalUuid,
    kind: z.enum(travelKinds),
    leadDays: optionalInt(0, 365),
    minorsOnly: checkbox,
    /** A program's extra (new lines only; a line keeps its parent). */
    opportunityId: optionalUuid,
    position: optionalInt(0, 32_767).transform((value) => value ?? 0),
    /** A route's own line (new lines only). */
    routeId: optionalUuid,
    sourceUrl,
    titleAr: text(200),
    titleEn: text(200),
  })
  .refine(
    (row) => row.id || (row.routeId === null) !== (row.opportunityId === null),
    {
      path: ["routeId"],
    }
  )
  .refine((row) => row.kind !== "document" || row.docKey, {
    path: ["docKey"],
  })
  .refine((row) => (row.anchor === null) === (row.leadDays === null), {
    path: ["leadDays"],
  });

export type RequirementInput = z.output<typeof requirementSchema>;

/**
 * The requirement's columns from the form. Only documents keep a key (the
 * database requires one for them and none otherwise).
 */
export const requirementRow = (input: RequirementInput) => ({
  anchor: input.anchor,
  checked_on: input.checkedOn,
  confidence: input.confidence,
  copies: input.copies,
  detail_ar: input.detailAr,
  detail_en: input.detailEn,
  doc_key: input.kind === "document" ? input.docKey : null,
  kind: input.kind,
  lead_days: input.anchor ? input.leadDays : null,
  minors_only: input.minorsOnly,
  position: input.position,
  source_url: input.sourceUrl,
  title_ar: input.titleAr,
  title_en: input.titleEn,
});

export const routeLinkSchema = z.object({ opportunityId: uuid, routeId: uuid });

/** Requirements in the order members see them: position, then oldest first. */
export const byPosition = <T extends { created_at: string; position: number }>(
  rows: readonly T[]
) =>
  [...rows].sort(
    (a, b) =>
      a.position - b.position || a.created_at.localeCompare(b.created_at)
  );

/** A country's name for an ISO code, or the code when it has none. */
export const countryName = (code: string, locale: Locale) => {
  try {
    return (
      new Intl.DisplayNames([locale], { fallback: "none", type: "region" }).of(
        code
      ) ?? code
    );
  } catch {
    return code;
  }
};
