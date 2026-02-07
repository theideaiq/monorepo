import type { UserRole } from '@/types/auth';

// biome-ignore lint/style/useImportType: This is a value import needed for typeof
export const CRM_STATUSES = [
  'lead',
  'contacted',
  'deal',
  'customer',
  'churned',
] as const;

// biome-ignore lint/style/useImportType: This is a value import needed for typeof
export type CRMStatus = (typeof CRM_STATUSES)[keyof typeof CRM_STATUSES];
export type { UserRole };

export type CRMContact = {
  id: string;
  user_id?: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: CRMStatus;
  last_contacted: string | null;
  notes: string | null;
  tags: string[];
  assigned_to?: string | null; // Admin ID
  lifetime_value: number;
  created_at: string;
  updated_at: string;
  metadata: {
    source?: string;
    role?: string;
    crm_status?: CRMStatus;
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic attributes
    [key: string]: any;
  };
};

// Campaign Types
export const CAMPAIGN_STATUSES = [
  'draft',
  'scheduled',
  'sending',
  'completed',
  'failed',
] as const;

// biome-ignore lint/style/useImportType: This is a value import needed for typeof
export type CampaignStatus =
  (typeof CAMPAIGN_STATUSES)[keyof typeof CAMPAIGN_STATUSES];

export type CRMCampaign = {
  id: string;
  name: string;
  subject: string;
  content: string; // HTML or Markdown
  segment_id: string | null; // Target Audience
  status: CampaignStatus;
  scheduled_for: string | null;
  sent_at: string | null;
  stats: {
    sent: number;
    opened: number;
    clicked: number;
    failed: number;
  };
  created_at: string;
  created_by: string;
};

export type CRMSegment = {
  id: string;
  name: string;
  description: string | null;
  criteria: Record<string, any>; // JSON logic for filtering users
  count: number; // Cached user count
  created_at: string;
};
