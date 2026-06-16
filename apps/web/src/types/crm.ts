import type { UserRole } from '@/types/auth';

export type CRMStatus = (typeof CRM_STATUSES)[keyof typeof CRM_STATUSES];
export type { UserRole };

export const CRM_STATUSES = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  LOST: 'lost',
  CUSTOMER: 'customer',
} as const;

export interface CRMUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  metadata?: {
    role?: string;
    crm_status?: CRMStatus;
    // biome-ignore lint/suspicious/noExplicitAny: Flexible metadata
    [key: string]: any;
  };
  created_at: string;
}

export const CAMPAIGN_STATUSES = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  SENT: 'sent',
} as const;

export type CampaignStatus =
  (typeof CAMPAIGN_STATUSES)[keyof typeof CAMPAIGN_STATUSES];

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  segment_id: string;
  status: CampaignStatus;
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
}
