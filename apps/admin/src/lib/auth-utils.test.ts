import { describe, expect, it } from 'vitest';
import { hasAdminAccess } from './auth-utils';
import { ROLES } from './constants';

describe('hasAdminAccess', () => {
  it('should return true for admin role', () => {
    expect(hasAdminAccess(ROLES.ADMIN)).toBe(true);
  });

  it('should return true for superadmin role', () => {
    expect(hasAdminAccess(ROLES.SUPERADMIN)).toBe(true);
  });

  it('should return true for mixed case admin role', () => {
    expect(hasAdminAccess('Admin')).toBe(true);
    expect(hasAdminAccess('ADMIN')).toBe(true);
  });

  it('should return false for user role', () => {
    expect(hasAdminAccess(ROLES.USER)).toBe(false);
  });

  it('should return false for student role', () => {
    expect(hasAdminAccess(ROLES.STUDENT)).toBe(false);
  });

  it('should return false for unknown roles', () => {
    expect(hasAdminAccess('hacker')).toBe(false);
  });

  it('should return false for null or undefined', () => {
    expect(hasAdminAccess(null)).toBe(false);
    expect(hasAdminAccess(undefined)).toBe(false);
    expect(hasAdminAccess('')).toBe(false);
  });
});
