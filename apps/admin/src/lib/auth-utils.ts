import { ROLES } from '@/lib/constants';

export function hasAdminAccess(role?: string | null): boolean {
  if (!role) return false;
  const normalizedRole = role.toLowerCase();
  return (
    normalizedRole === ROLES.ADMIN.toLowerCase() ||
    normalizedRole === ROLES.SUPERADMIN.toLowerCase()
  );
}
