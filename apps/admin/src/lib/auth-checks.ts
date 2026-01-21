import { ROLES } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';

/**
 * Checks if the provided role has administrative privileges (Admin or Superadmin).
 * Is case-insensitive.
 *
 * @param role - The user role string to check.
 * @returns True if the role is Admin or Superadmin, false otherwise.
 */
export function hasAdminAccess(role?: string | null): boolean {
  if (!role) return false;
  const normalizedRole = role.toLowerCase();
  return (
    normalizedRole === ROLES.ADMIN.toLowerCase() ||
    normalizedRole === ROLES.SUPERADMIN.toLowerCase()
  );
}

/**
 * Verifies that the current user is authenticated, not banned, and has Admin or Superadmin role.
 * Throws an error if any check fails.
 *
 * @returns Object containing the Supabase client, user, and requester profile.
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
 * Throws an error if any check fails.
 *
 * @returns Object containing the Supabase client, user, and requester profile.
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

  if (!requester.role || requester.role.toLowerCase() !== ROLES.SUPERADMIN.toLowerCase()) {
    throw new Error('Unauthorized: Insufficient permissions');
  }

  return { supabase, user, requester };
}
