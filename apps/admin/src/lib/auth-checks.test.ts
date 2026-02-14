import { hasAdminAccess } from './auth-checks.client';

describe('Auth Checks', () => {
  describe('hasAdminAccess', () => {
    it('should return true for admin role', () => {
      expect(hasAdminAccess('admin')).toBe(true);
      expect(hasAdminAccess('ADMIN')).toBe(true);
    });

    it('should return true for superadmin role', () => {
      expect(hasAdminAccess('superadmin')).toBe(true);
      expect(hasAdminAccess('SUPERADMIN')).toBe(true);
    });

    it('should return false for other roles', () => {
      expect(hasAdminAccess('user')).toBe(false);
      expect(hasAdminAccess('staff')).toBe(false);
    });

    it('should return false for null/undefined role', () => {
      expect(hasAdminAccess(null)).toBe(false);
      expect(hasAdminAccess(undefined)).toBe(false);
    });
  });
});
