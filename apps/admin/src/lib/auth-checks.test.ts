import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hasAdminAccess } from './auth-utils';
import { requireAdmin } from './auth-checks';
import { ROLES } from './constants';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mocks.getUser,
    },
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

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user and requester for valid admin', async () => {
    const mockUser = { id: 'user-123' };
    const mockProfile = { id: 'user-123', role: ROLES.ADMIN, banned: false };

    mocks.getUser.mockResolvedValue({ data: { user: mockUser } });
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockProfile }),
        }),
      }),
    });

    const result = await requireAdmin();
    expect(result.user).toEqual(mockUser);
    expect(result.requester).toEqual(mockProfile);
  });

  it('should throw if no user session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    await expect(requireAdmin()).rejects.toThrow(
      'Authentication required: No user session found',
    );
  });

  it('should throw if user is banned', async () => {
    const mockUser = { id: 'user-123' };
    const mockProfile = { id: 'user-123', role: ROLES.ADMIN, banned: true };

    mocks.getUser.mockResolvedValue({ data: { user: mockUser } });
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockProfile }),
        }),
      }),
    });

    await expect(requireAdmin()).rejects.toThrow(
      'Unauthorized: User invalid or banned',
    );
  });

  it('should throw if user is not admin', async () => {
    const mockUser = { id: 'user-123' };
    const mockProfile = { id: 'user-123', role: ROLES.USER, banned: false };

    mocks.getUser.mockResolvedValue({ data: { user: mockUser } });
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockProfile }),
        }),
      }),
    });

    await expect(requireAdmin()).rejects.toThrow(
      'Unauthorized: Insufficient permissions',
    );
  });
});
