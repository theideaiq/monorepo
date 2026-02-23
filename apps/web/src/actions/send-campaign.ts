import { Logger } from '@repo/utils';
import { createClient } from '@/lib/supabase/client';
import { requireAdmin } from '@/lib/auth-utils';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendCampaign(segmentId: string, templateId: string) {
  const { supabase } = await requireAdmin();

  // 1. Fetch Segment Users
  const { data: segment } = await supabase
    .from('segments')
    .select('criteria')
    .eq('id', segmentId)
    .single();

  if (!segment) throw new Error('Segment not found');

  // Simple criteria logic for now (all users)
  const { data: profiles } = await supabase.from('profiles').select('email');

  if (!profiles || profiles.length === 0)
    throw new Error('No users found for this segment');

  // biome-ignore lint/suspicious/noExplicitAny: legacy
  const emails = profiles.map((p: any) => p.email).filter(Boolean);

  // 3. Send in Batches
  const batchSize = 100;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    await resend.emails.send({
      from: 'marketing@theidea.iq',
      to: batch,
      subject: 'New Campaign',
      html: '<p>Check out our latest offers!</p>',
    });
  }

  return { sent: emails.length };
}
