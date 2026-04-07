/**
 * Defined user roles for the application.
 */
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
  STUDENT: 'student',
} as const;

/**
 * Statuses for CRM contacts.
 */
export const CRM_STATUSES = {
  LEAD: 'lead',
  CUSTOMER: 'customer',
  VIP: 'vip',
  CHURNED: 'churned',
} as const;

/**
 * Lifecycle statuses for marketing campaigns.
 */
export const CAMPAIGN_STATUSES = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  SENT: 'sent',
  FAILED: 'failed',
} as const;

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
