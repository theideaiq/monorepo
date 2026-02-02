'use server';

import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/lib/audit';
import { requireAdmin } from '@/lib/server-auth';

export async function createSegment(
  name: string,
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic criteria
  criteria: Record<string, any>,
) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from('marketing_segments')
    .insert({ name, criteria });

  if (error) throw new Error(error.message);
  revalidatePath('/marketing/segments');
}

export async function createCampaign(
  subject: string,
  segment_id: string,
  body_html: string,
) {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from('marketing_campaigns')
    .insert({
      subject,
      segment_id,
      body_html,
      status: 'draft',
      sent_count: 0,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  await logAdminAction('create_campaign', 'marketing', { subject, segment_id });
  revalidatePath('/marketing/campaigns');
  return data.id;
}
