'use server';

import { revalidatePath } from 'next/cache';
import React from 'react';
import { logAdminAction } from '@/lib/audit';
import { Resend } from 'resend';
import { BrandedTemplate } from '@/emails/BrandedTemplate';
import { createClient } from '@/lib/supabase/server';

const BATCH_SIZE = 50;

export async function sendCampaign(campaignId: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    throw new Error('Missing RESEND_API_KEY');
  }

  const resend = new Resend(RESEND_API_KEY);
  const supabase = await createClient();

  // 0. Security Check: Validate User & Role
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: requester } = await supabase
    .from('profiles')
    .select('role, banned')
    .eq('id', user.id)
    .single();

  if (!requester || requester.banned) {
    throw new Error('Unauthorized: User invalid or banned');
  }

  if (requester.role !== 'admin' && requester.role !== 'superadmin') {
    throw new Error('Unauthorized: Insufficient permissions');
  }

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
