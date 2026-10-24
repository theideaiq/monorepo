import { project } from "@repo/config";
import { createAdminClient } from "@repo/database/admin";
import { resend } from "@repo/email";
import { CampaignTemplate } from "@repo/email/templates/campaign";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { createElement } from "react";
import { z } from "zod";
import { env } from "@/env";
import { parseCriteria, resolveRecipients } from "../../_lib/recipients";
import { requireStaffCaller } from "../../_lib/staff";
import { unsubscribeUrl } from "../../_lib/unsubscribe";

// Large segments take a while: batches of 100 emails, one after another.
export const maxDuration = 300;

const body = z.object({ campaignId: z.uuid() });

/** Resend accepts at most 100 emails per batch request. */
const BATCH_SIZE = 100;

/**
 * Sends a draft marketing campaign to its segment. Called by the back office
 * (/admin in The IDEA Spark) with the staff member's token: the caller must be marketing,
 * admin or superadmin staff at AAL2. Recipients are customers who opted in
 * to marketing email (`profiles.marketing_opt_in`), aren't suspended, match
 * the segment and have an email address. Each email carries a signed
 * one-click unsubscribe link (also as List-Unsubscribe).
 */
export const POST = async (request: Request) => {
  const caller = await requireStaffCaller(request, [
    "marketing",
    "admin",
    "superadmin",
  ]);
  if (caller instanceof NextResponse) {
    return caller;
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const secret = env.SUPABASE_SECRET_KEY;
  const apiUrl = env.NEXT_PUBLIC_API_URL;
  if (!(resend && env.RESEND_FROM && secret && apiUrl)) {
    return NextResponse.json(
      { error: "email_not_configured" },
      { status: 503 }
    );
  }

  const { campaignId } = parsed.data;
  // Read as the caller first, so RLS confirms they can see this campaign.
  const { data: visible } = await caller.supabase
    .from("marketing_campaigns")
    .select("id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!visible) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const admin = createAdminClient();
  // Claim the draft: only one request can move it to "sending".
  const { data: campaign } = await admin
    .from("marketing_campaigns")
    .update({ status: "sending" })
    .eq("id", campaignId)
    .eq("status", "draft")
    .select("id, subject, body, segment_id")
    .maybeSingle();
  if (!campaign) {
    return NextResponse.json({ error: "not_a_draft" }, { status: 409 });
  }

  let sent = 0;
  try {
    let criteria = parseCriteria({});
    if (campaign.segment_id) {
      const { data: segment } = await admin
        .from("marketing_segments")
        .select("criteria")
        .eq("id", campaign.segment_id)
        .maybeSingle();
      criteria = segment ? parseCriteria(segment.criteria) : null;
    }
    const recipients = criteria ? await resolveRecipients(admin, criteria) : [];

    for (let start = 0; start < recipients.length; start += BATCH_SIZE) {
      const batch = recipients
        .slice(start, start + BATCH_SIZE)
        .map((recipient) => {
          const link = unsubscribeUrl(
            apiUrl,
            secret,
            recipient.userId,
            recipient.locale
          );
          return {
            from: env.RESEND_FROM as string,
            headers: {
              "List-Unsubscribe": `<${link}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
            react: createElement(CampaignTemplate, {
              body: campaign.body,
              brandName: project.name,
              locale: recipient.locale,
              siteUrl: project.url ?? "",
              subject: campaign.subject,
              supportEmail: project.supportEmail ?? "",
              unsubscribeUrl: link,
            }),
            subject: campaign.subject,
            tags: [{ name: "campaign", value: campaign.id }],
            to: recipient.email,
          };
        });
      // biome-ignore lint/performance/noAwaitInLoops: batches go out one at a time
      const { error } = await resend.batch.send(batch, {
        idempotencyKey: `campaign-${campaign.id}-${start}`,
      });
      if (error) {
        throw new Error(error.message);
      }
      sent += batch.length;
    }

    await admin
      .from("marketing_campaigns")
      .update({
        sent_at: new Date().toISOString(),
        sent_count: sent,
        status: "sent",
      })
      .eq("id", campaign.id);

    log.info(`Campaign ${campaign.id} sent to ${sent} recipients`);
    return NextResponse.json({ sent });
  } catch (error) {
    log.error(`Campaign ${campaign.id} failed: ${parseError(error)}`);
    await admin
      .from("marketing_campaigns")
      .update({ sent_count: sent, status: "failed" })
      .eq("id", campaign.id);
    return NextResponse.json({ error: "send_failed", sent }, { status: 502 });
  }
};
