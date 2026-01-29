import type { ROLES } from '@/lib/constants';

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
