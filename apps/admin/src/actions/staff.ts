'use server';

import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/lib/audit';
import { requireAdmin, requireSuperAdmin } from '@/lib/server-auth';
import type { UserRole } from '@/types/auth';

export async function getStaff() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('role', 'user')
    .order('full_name');

  if (error) throw new Error(error.message);
  return data;
}

export async function updateRole(userId: string, newRole: UserRole) {
  const { supabase } = await requireSuperAdmin();

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  await logAdminAction('update_role', 'staff', {
    target_user_id: userId,
    new_role: newRole,
  });
  revalidatePath('/settings/staff');
}

export async function toggleBan(userId: string, banStatus: boolean) {
  const { supabase } = await requireSuperAdmin();

  const { error } = await supabase
    .from('profiles')
    .update({ banned: banStatus })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  await logAdminAction('toggle_ban', 'staff', {
    target_user_id: userId,
    banned: banStatus,
  });
  revalidatePath('/settings/staff');
}

export async function addStaff(email: string) {
  const { supabase } = await requireSuperAdmin();

  // Find user by email (in profiles table)
  const { data: target, error: searchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (searchError || !target) {
    throw new Error(
      'User not found. Ensure they have signed up and their profile has an email set.',
    );
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', target.id);

  if (error) throw new Error(error.message);

  await logAdminAction('promote_staff', 'staff', {
    target_user_id: target.id,
    email,
  });
  revalidatePath('/settings/staff');
}
