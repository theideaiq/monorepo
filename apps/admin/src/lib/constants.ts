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
