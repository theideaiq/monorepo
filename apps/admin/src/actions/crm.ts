'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth-checks.server';
import type { CRMStatus } from '@/types/crm';

export async function updateProfile(
  id: string,
  data: { crm_tags?: string[]; crm_status?: CRMStatus },
) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from('profiles').update(data).eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/crm/contacts');
}
