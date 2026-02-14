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

// Isomorphic helpers (like hasAdminAccess) are kept here.
// Server-only logic has been moved to src/lib/supabase/server.ts and similar files
// to prevent import errors in Client Components.
