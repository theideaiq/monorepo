import * as nextCache from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as audit from '@/lib/audit';
import { addStaff, updateRole } from './staff';

// Mock dependencies using vi.hoisted to avoid ReferenceError
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

vi.mock('@/lib/audit', () => ({
  logAdminAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('staff actions - updateRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupSupabaseMock = (
    user: { id: string } | null,
    requesterRole: string | null = null,
    updateError: { message: string } | null = null,
  ) => {
    // Mock getUser
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user },
      error: null,
    });

    // Mock query builder chain
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: updateError }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: requesterRole ? { role: requesterRole } : null,
          error: null,
        }),
      }),
    });

    mocks.supabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      return {
        select: vi.fn(),
        update: vi.fn(),
      };
    });

    return { mockSelect, mockUpdate };
  };

  it('should allow superadmin to update role', async () => {
    // Arrange
    const superAdminId = 'super-admin-id';
    const targetUserId = 'target-user-id';
    const newRole = 'admin';

    setupSupabaseMock({ id: superAdminId }, 'superadmin');

    // Act
    await updateRole(targetUserId, newRole);

    // Assert
    expect(mocks.supabase.from).toHaveBeenCalledWith('profiles');
    expect(audit.logAdminAction).toHaveBeenCalledWith('update_role', 'staff', {
      target_user_id: targetUserId,
      new_role: newRole,
    });
    expect(nextCache.revalidatePath).toHaveBeenCalledWith('/settings/staff');
  });

  it('should throw error if requester is not superadmin', async () => {
    // Arrange
    const adminId = 'admin-id';
    setupSupabaseMock({ id: adminId }, 'admin');

    // Act & Assert
    await expect(updateRole('target-id', 'admin')).rejects.toThrow(
      'Unauthorized: Insufficient permissions',
    );

    expect(audit.logAdminAction).not.toHaveBeenCalled();
    expect(nextCache.revalidatePath).not.toHaveBeenCalled();
  });

  it('should throw error if user is not authenticated', async () => {
    // Arrange
    setupSupabaseMock(null);

    // Act & Assert
    await expect(updateRole('target-id', 'admin')).rejects.toThrow(
      'Authentication required: No user session found',
    );

    expect(audit.logAdminAction).not.toHaveBeenCalled();
  });

  it('should throw error if update operation fails', async () => {
    // Arrange
    const superAdminId = 'super-admin-id';
    setupSupabaseMock({ id: superAdminId }, 'superadmin', {
      message: 'Database error',
    });

    // Act & Assert
    await expect(updateRole('target-id', 'admin')).rejects.toThrow(
      'Database error',
    );
  });
});

describe('staff actions - addStaff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupSupabaseMock = (
    user: { id: string } | null,
    requesterRole: string | null = null,
    updateError: { message: string } | null = null,
    searchError: { message: string } | null = null,
    targetUser: { id: string } | null = null,
  ) => {
    // Mock getUser
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user },
      error: null,
    });

    // Mock query builder chain
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: updateError }),
    });

    const mockSelectForAuthCheck = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: requesterRole ? { role: requesterRole } : null,
          error: null, // Auth check should succeed for superadmin
        }),
      }),
    });

    const mockSelectForTargetUser = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: targetUser,
          error: searchError,
        }),
      }),
    });

    // We need to differentiate between the select call for auth (by id)
    // and the select call for the target user (by email).
    // The easiest way is to track the mock calls or use mockImplementation.
    const mockSelect = vi.fn().mockImplementation((columns) => {
      if (columns === 'role, banned') {
        // This is the auth check query
        return mockSelectForAuthCheck();
      }
      return mockSelectForTargetUser(); // This is the target user query (e.g. select('id'))
    });

    mocks.supabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      return {
        select: vi.fn(),
        update: vi.fn(),
      };
    });

    return { mockSelect, mockUpdate };
  };

  it('should throw error if user to add is not found', async () => {
    // Arrange
    const superAdminId = 'super-admin-id';
    setupSupabaseMock(
      { id: superAdminId },
      'superadmin',
      null, // updateError
      { message: 'Not found' }, // searchError
      null, // targetUser
    );

    // Act & Assert
    await expect(addStaff('nonexistent@example.com')).rejects.toThrow(
      'User not found. Ensure they have signed up and their profile has an email set.',
    );
  });
});
