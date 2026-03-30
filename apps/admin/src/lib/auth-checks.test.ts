import { describe, expect, it, vi, beforeEach } from 'vitest';
import { hasAdminAccess, requireSuperAdmin } from './auth-checks';
import { ROLES } from './constants';

const mocks = vi.hoisted(() => {
  return {
    getUser: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    select: vi.fn(),
    from: vi.fn(),
  };
});

// Setup mock return values/chaining
mocks.from.mockReturnValue({ select: mocks.select });
mocks.select.mockReturnValue({ eq: mocks.eq });
mocks.eq.mockReturnValue({ single: mocks.single });

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  }),
}));

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

describe('requireSuperAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ single: mocks.single });
  });

  it('should throw explicit error when the user is banned', async () => {
    // Arrange
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    mocks.single.mockResolvedValue({
      data: { role: ROLES.SUPERADMIN, banned: true },
      error: null,
    });

    // Act & Assert
    await expect(requireSuperAdmin()).rejects.toThrow(
      'Unauthorized: User invalid or banned',
    );
  });
});
