'use server';

import { adminEnv as env } from '@repo/env/admin';
import { revalidatePath } from 'next/cache';
import React from 'react';
import { Resend } from 'resend';
import { BrandedTemplate } from '@/emails/BrandedTemplate';
import { logAdminAction } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth-checks/server';

const BATCH_SIZE = 50;

/**
 * Sends a marketing campaign to a segment of users.
 *
 * Architecture:
 * - Uses Resend for email delivery.
 * - Batches emails in chunks of 50 to avoid API rate limits.
 * - Renders React Email templates server-side.
 *
 * Security:
 * - Explicit `requireAdmin()` check (Defense in Depth).
 *
 * @param campaignId - ID of the campaign to send.
 */
export async function sendCampaign(campaignId: string) {
  const resend = new Resend(env.RESEND_API_KEY);

  // Security Check: Validate Admin Access
  const { supabase } = await requireAdmin();

  // 1. Fetch Campaign & Segment
  const { data: campaign, error: campError } = await supabase
    .from('marketing_campaigns')
    .select('*, segment:marketing_segments(criteria)')
    .eq('id', campaignId)
    .single();

  if (campError || !campaign) throw new Error('Campaign not found');

  const criteria = campaign.segment?.criteria;
  if (!criteria) throw new Error('Segment criteria not found');

  // 2. Query Profiles
  let query = supabase.from('profiles').select('email');

  if (criteria.role) {
    query = query.eq('role', criteria.role);
  }
  if (criteria.crm_status) {
    query = query.eq('crm_status', criteria.crm_status);
  }

  const { data: profiles, error: profError } = await query;

  if (profError) throw new Error('Failed to fetch profiles');
  if (!profiles || profiles.length === 0)
    throw new Error('No users found for this segment');

  const emails = profiles.map((p: any) => p.email).filter(Boolean);

  // 3. Send in Batches
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const chunk = emails.slice(i, i + BATCH_SIZE);

    const batch = chunk.map((email: string) => ({
      from: 'The IDEA <onboarding@resend.dev>', // Replace with verified domain in production
      to: email,
      subject: campaign.subject,
      react: React.createElement(BrandedTemplate, {
        subject: campaign.subject,
        bodyHtml: campaign.body_html,
      }),
    }));

    await resend.batch.send(batch);
  }

  // 4. Update Campaign Status
  await supabase
    .from('marketing_campaigns')
    .update({
      status: 'sent',
      sent_count: emails.length,
      sent_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  await logAdminAction('send_campaign', 'marketing', {
    campaign_id: campaignId,
    count: emails.length,
  });
  revalidatePath('/marketing/campaigns');
}
