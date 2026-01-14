'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { CRMStatus } from '@/types/crm';

export async function updateProfile(
  id: string,
  data: { crm_tags?: string[]; crm_status?: CRMStatus },
) {
  const supabase = await createClient();

  const { error } = await supabase.from('profiles').update(data).eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/crm/contacts');
}
