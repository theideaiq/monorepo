import { z } from "zod";

export const crmStatuses = ["lead", "customer", "vip", "churned"] as const;

/**
 * A marketing segment's criteria (`marketing_segments.criteria`). Every
 * criterion is optional; a recipient must match all that are set:
 *   crm_status   any of these CRM statuses
 *   tags         at least one of these CRM tags
 *   plus_member  has (true) or hasn't (false) a live membership of The IDEA Plus
 *   locale       preferred language
 * Only customers who opted in to marketing (`profiles.marketing_opt_in`)
 * and aren't suspended ever receive a campaign. apps/api resolves the
 * recipients with the same rules (apps/api/app/admin/campaigns/send).
 */
export const segmentCriteria = z
  .object({
    crm_status: z.array(z.enum(crmStatuses)).min(1).optional(),
    locale: z.enum(["ar", "en"]).optional(),
    plus_member: z.boolean().optional(),
    tags: z
      .array(z.string().trim().toLowerCase().min(1).max(40))
      .min(1)
      .max(20)
      .optional(),
  })
  .strict();

export type SegmentCriteria = z.infer<typeof segmentCriteria>;

/** Reads stored criteria; unknown or malformed criteria become `{}`. */
export const parseCriteria = (value: unknown): SegmentCriteria => {
  const parsed = segmentCriteria.safeParse(value);
  return parsed.success ? parsed.data : {};
};

/** Builds criteria from the segment form, leaving out "any" choices. */
export const criteriaFromForm = (form: {
  crmStatus?: string[];
  locale?: string;
  plusMember?: string;
  tags?: string[];
}): SegmentCriteria => {
  const criteria: SegmentCriteria = {};
  const statuses = (form.crmStatus ?? []).filter(
    (status): status is (typeof crmStatuses)[number] =>
      (crmStatuses as readonly string[]).includes(status)
  );
  if (statuses.length > 0) {
    criteria.crm_status = [...new Set(statuses)];
  }
  if (form.tags && form.tags.length > 0) {
    criteria.tags = form.tags;
  }
  if (form.plusMember === "yes" || form.plusMember === "no") {
    criteria.plus_member = form.plusMember === "yes";
  }
  if (form.locale === "ar" || form.locale === "en") {
    criteria.locale = form.locale;
  }
  return segmentCriteria.parse(criteria);
};
