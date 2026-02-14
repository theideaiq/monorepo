import { ROLES } from '@/lib/constants';

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
 * Checks if a user has permission based on their role.
 * Safe for use in Client Components.
 */
export function hasPermission(
  userRole: string | null,
  requiredRole: string,
) {
  if (!userRole) return false;
  if (userRole.toLowerCase() === 'superadmin') return true;
  return userRole.toLowerCase() === requiredRole.toLowerCase();
}
