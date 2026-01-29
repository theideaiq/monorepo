import type { CAMPAIGN_STATUSES, CRM_STATUSES } from '@/lib/constants';
import type { UserRole } from '@/types/auth';

export type CRMStatus = (typeof CRM_STATUSES)[keyof typeof CRM_STATUSES];
export type { UserRole };

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role?: UserRole | string;
  updated_at?: string;
  crm_tags: string[] | null;
  crm_status: CRMStatus | null;
}

export interface MarketingSegment {
  id: string;
  name: string;
  criteria: {
    role?: string;
    crm_status?: CRMStatus;
    // biome-ignore lint/suspicious/noExplicitAny: Extensible metadata
    [key: string]: any;
  };
  created_at: string;
}

export type CampaignStatus =
  (typeof CAMPAIGN_STATUSES)[keyof typeof CAMPAIGN_STATUSES];

export interface MarketingCampaign {
  id: string;
  subject: string;
  body_html: string;
  segment_id: string;
  status: CampaignStatus;
  sent_count: number;
  sent_at: string | null;
  created_at: string;

  // Optional join fields
  segment?: MarketingSegment;
}
