import { ROLES } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import { hasAdminAccess } from '@/lib/auth-utils';

/**
 * Verifies that the current user is authenticated, not banned, and has Admin or Superadmin role.
 *
 * Security:
 * - Checks Auth Session (Authentication)
 * - Checks Database Profile (Authorization & Ban Status)
 * - Throws explicit errors to be caught by the UI or Server Action wrapper.
 *
 * @returns Object containing the Supabase client, user, and requester profile.
 * @throws Error if unauthorized.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Authentication required: No user session found');
  }

  const { data: requester } = await supabase
    .from('profiles')
    .select('role, banned')
    .eq('id', user.id)
    .single();

  if (!requester || requester.banned) {
    throw new Error('Unauthorized: User invalid or banned');
  }

  if (!hasAdminAccess(requester.role)) {
    throw new Error('Unauthorized: Insufficient permissions');
  }

  return { supabase, user, requester };
}

/**
 * Verifies that the current user is authenticated, not banned, and has Superadmin role.
 * Used for sensitive operations like managing other staff members.
 *
 * @returns Object containing the Supabase client, user, and requester profile.
 * @throws Error if unauthorized.
 */
export async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Authentication required: No user session found');
  }

  const { data: requester, error } = await supabase
    .from('profiles')
    .select('role, banned')
    .eq('id', user.id)
    .single();

  if (error) {
    // Explicitly handle query failures instead of relying on undefined data
    throw new Error('Database error while fetching requester profile');
  }

  if (!requester || requester.banned) {
    throw new Error('Unauthorized: User invalid or banned');
  }

  if (
    !requester.role ||
    requester.role.toLowerCase() !== ROLES.SUPERADMIN.toLowerCase()
  ) {
    throw new Error('Unauthorized: Insufficient permissions');
  }

  return { supabase, user, requester };
}
