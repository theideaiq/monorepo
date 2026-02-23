import type { UserRole } from '@/types/auth';

export const CRM_STATUSES = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  LOST: 'lost',
} as const;

export type CRMStatus = (typeof CRM_STATUSES)[keyof typeof CRM_STATUSES];
export type { UserRole };

export interface CustomerProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  metadata: {
    role?: string;
    crm_status?: CRMStatus;
    // biome-ignore lint/suspicious/noExplicitAny: legacy
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
  // biome-ignore lint/suspicious/noExplicitAny: legacy
  content: any; // Rich text JSON
  status: CampaignStatus;
  segment_id: string;
  scheduled_at?: string;
}
