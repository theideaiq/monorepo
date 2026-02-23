import type { ROLES } from '@/lib/constants';

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export interface User {
  id: string;
  email: string;
  role: UserRole;
}
