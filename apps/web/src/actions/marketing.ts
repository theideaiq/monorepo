import { Logger } from '@repo/utils';
import { createClient } from '@/lib/supabase/client';
import { requireAdmin } from '@/lib/auth-utils';

export async function createSegment(
  name: string,
  // biome-ignore lint/suspicious/noExplicitAny: legacy
  criteria: Record<string, any>,
) {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from('segments')
    .insert({ name, criteria })
    .select()
    .single();

  if (error) {
    Logger.error('Error creating segment:', error);
    throw new Error('Failed to create segment');
  }

  return data;
}
