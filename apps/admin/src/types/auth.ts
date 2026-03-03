import type { ROLES } from '@/lib/constants';

// biome-ignore lint/style/useImportType: This is a value import needed for typeof
export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export interface UserProfile {
  id: string;
  email?: string;
  role: UserRole;
  full_name?: string;
  avatar_url?: string;
  updated_at?: string;
  banned?: boolean;
}
