'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createSegment(
  name: string,
  criteria: Record<string, any>,
) {
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  revalidatePath('/marketing/campaigns');
  return data.id;
}
