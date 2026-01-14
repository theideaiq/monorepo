export type UserRole = 'user' | 'admin' | 'superadmin';

export interface UserProfile {
  id: string;
  email?: string;
  role: UserRole;
  full_name?: string;
  avatar_url?: string;
  updated_at?: string;
  banned?: boolean;
}
