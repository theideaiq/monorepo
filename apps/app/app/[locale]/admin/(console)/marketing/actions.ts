"use server";

import { z } from "zod";
import {
  ActionFailure,
  affected,
  check,
  staffAction,
} from "@/lib/admin/action";
import type { ActionError } from "@/lib/admin/action-state";
import { success } from "@/lib/admin/action-state";
import { callApi } from "@/lib/admin/api";
import { optionalUuid, tags, text, uuid } from "@/lib/admin/forms";
import { criteriaFromForm, parseCriteria } from "@/lib/admin/segments";

const segmentSchema = z.object({
  crmStatus: z.array(z.string()).optional(),
  id: optionalUuid,
  locale: z.string().optional(),
  name: text(120),
  plusMember: z.string().optional(),
  tags,
});

export const saveSegment = staffAction(
  "marketing",
  segmentSchema,
  async ({ input, supabase }) => {
    const row = {
      criteria: criteriaFromForm({
        crmStatus: input.crmStatus,
        locale: input.locale,
        plusMember: input.plusMember,
        tags: input.tags,
      }),
      name: input.name,
    };
    if (input.id) {
      affected(
        await supabase
          .from("marketing_segments")
          .update(row)
          .eq("id", input.id)
          .select("id")
      );
    } else {
      check(await supabase.from("marketing_segments").insert(row));
    }
    return success();
  }
);

export const deleteSegment = staffAction(
  "marketing",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(
      await supabase.from("marketing_segments").delete().eq("id", input.id)
    );
    return success("deleted");
  }
);

/** Recipients a segment reaches now (apps/api resolves emails). */
export const countRecipients = staffAction(
  "marketing",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    const { data: segment } = await supabase
      .from("marketing_segments")
      .select("criteria")
      .eq("id", input.id)
      .maybeSingle();
    if (!segment) {
      throw new ActionFailure("notFound");
    }
    const result = await callApi<{ count: number }>(
      supabase,
      "/admin/segments/preview",
      { criteria: parseCriteria(segment.criteria) }
    );
    if (!result.ok) {
      throw new ActionFailure(
        result.status === 0 ? "apiUnavailable" : "unknown"
      );
    }
    return success("saved", { data: { count: result.data.count } });
  },
  "read"
);

const campaignSchema = z.object({
  body: text(50_000),
  id: optionalUuid,
  segmentId: optionalUuid,
  subject: text(200),
});

export const saveCampaign = staffAction(
  "marketing",
  campaignSchema,
  async ({ input, supabase }) => {
    const row = {
      body: input.body,
      segment_id: input.segmentId,
      subject: input.subject,
    };
    if (input.id) {
      // RLS only lets drafts change.
      affected(
        await supabase
          .from("marketing_campaigns")
          .update(row)
          .eq("id", input.id)
          .select("id")
      );
      return success();
    }
    const { data } = check(
      await supabase
        .from("marketing_campaigns")
        .insert(row)
        .select("id")
        .single()
    );
    return success("saved", { redirectTo: `/marketing/campaigns/${data?.id}` });
  }
);

export const deleteCampaign = staffAction(
  "marketing",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("marketing_campaigns")
        .delete()
        .eq("id", input.id)
        .select("id")
    );
    return success("deleted", { redirectTo: "/marketing" });
  }
);

const sendErrors: Record<string, ActionError> = {
  email_not_configured: "emailNotConfigured",
  forbidden: "forbidden",
  mfa_required: "unauthorized",
  not_a_draft: "transition",
  not_found: "notFound",
  unauthorized: "unauthorized",
};

/** Sends a draft through apps/api, which holds the email credentials. */
export const sendCampaign = staffAction(
  "marketing",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    const result = await callApi<{ sent: number }>(
      supabase,
      "/admin/campaigns/send",
      { campaignId: input.id }
    );
    if (!result.ok) {
      throw new ActionFailure(
        result.status === 0
          ? "apiUnavailable"
          : (sendErrors[result.error] ?? "unknown")
      );
    }
    return success("sent", { data: { sent: result.data.sent } });
  }
);
