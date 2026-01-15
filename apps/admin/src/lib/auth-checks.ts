import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserRole } from '@/types/auth';

/**
 * Validates that the current user is authenticated, has an admin/superadmin role,
 * and is not banned. Throws an error if any check fails.
 *
 * @param supabase The Supabase client instance
 * @param allowedRoles Array of allowed roles (default: ['admin', 'superadmin'])
 */
export async function requireAdmin(
  supabase: SupabaseClient,
  allowedRoles: UserRole[] = ['admin', 'superadmin'],
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: requester } = await supabase
    .from('profiles')
    .select('role, banned')
    .eq('id', user.id)
    .single();

  if (!requester || requester.banned) {
    throw new Error('Unauthorized: User invalid or banned');
  }

  if (!allowedRoles.includes(requester.role as UserRole)) {
    throw new Error('Unauthorized: Insufficient permissions');
  }

  return user;
}
