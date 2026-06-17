import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hasAdminAccess, requireAdmin, requireSuperAdmin } from './auth-checks';
import { ROLES } from './constants';

const mocks = vi.hoisted(() => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mocks.supabase)),
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

  const setupSupabaseMock = (
    user: { id: string } | null,
    profileData: { role?: string; banned?: boolean } | null = null,
    profileError: { message: string } | null = null,
  ) => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user },
      error: null,
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: profileData,
      error: profileError,
    });

    const mockEq = vi.fn().mockReturnValue({
      single: mockSingle,
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    });

    mocks.supabase.from.mockReturnValue({
      select: mockSelect,
    });
  };

  it('should throw error when authenticated user is banned', async () => {
    // Arrange
    const userId = 'banned-user-id';
    setupSupabaseMock(
      { id: userId },
      { role: ROLES.ADMIN, banned: true },
    );

    // Act & Assert
    await expect(requireAdmin()).rejects.toThrow('Unauthorized: User invalid or banned');
  });

  it('should throw error when authenticated user has insufficient permissions', async () => {
    // Arrange
    const userId = 'user-id';
    setupSupabaseMock(
      { id: userId },
      { role: ROLES.USER, banned: false },
    );

    // Act & Assert
    await expect(requireAdmin()).rejects.toThrow('Unauthorized: Insufficient permissions');
  });
});

describe('requireSuperAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupSupabaseMock = (
    user: { id: string } | null,
    profileData: { role?: string; banned?: boolean } | null = null,
    profileError: { message: string } | null = null,
  ) => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user },
      error: null,
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: profileData,
      error: profileError,
    });

    const mockEq = vi.fn().mockReturnValue({
      single: mockSingle,
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    });

    mocks.supabase.from.mockReturnValue({
      select: mockSelect,
    });
  };

  it('should throw error when authenticated user is banned', async () => {
    // Arrange
    const userId = 'banned-superadmin-id';
    setupSupabaseMock(
      { id: userId },
      { role: ROLES.SUPERADMIN, banned: true },
    );

    // Act & Assert
    await expect(requireSuperAdmin()).rejects.toThrow('Unauthorized: User invalid or banned');
  });
});
