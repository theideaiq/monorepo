import type { ROLES } from '@/lib/constants';

export type UserRole = (typeof ROLES)[keyof typeof ROLES];
