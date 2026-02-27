'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(50, 'Full name must be at most 50 characters'),
});

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const rawFullName = formData.get('fullName');

  if (!rawFullName || typeof rawFullName !== 'string') {
    throw new Error('Full name is required');
  }

  const result = updateProfileSchema.safeParse({ fullName: rawFullName });

  if (!result.success) {
    const errorList = result.error.flatten().fieldErrors.fullName;
    const errorMessage = errorList?.[0] || 'Invalid input';
    throw new Error(errorMessage);
  }

  const { fullName } = result.data;

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id);

  if (error) {
    throw new Error('Failed to update profile');
  }

  revalidatePath('/[locale]/account', 'page');
}
