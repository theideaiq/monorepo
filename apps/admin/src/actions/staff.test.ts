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
    targetUser: { id: string } | null = null,
    searchError: { message: string } | null = null,
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

    const mockSelect = vi.fn().mockImplementation(() => {
      // Mocking different select chains based on the context (requester role vs search target)
      let currentEqKey = '';
      return {
        eq: vi.fn().mockImplementation((key, val) => {
          currentEqKey = key;
          return {
            single: vi.fn().mockImplementation(() => {
              if (currentEqKey === 'id') {
                return Promise.resolve({
                  data: requesterRole ? { role: requesterRole } : null,
                  error: null,
                });
              }
              if (currentEqKey === 'email') {
                return Promise.resolve({
                  data: targetUser,
                  error: searchError,
                });
              }
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }),
      };
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

  it('should promote an existing user to admin using their email', async () => {
    // Arrange
    const superAdminId = 'super-admin-id';
    const targetUserId = 'new-admin-id';
    const targetEmail = 'newadmin@example.com';

    setupSupabaseMock(
      { id: superAdminId },
      'superadmin',
      { id: targetUserId },
      null,
      null
    );

    // Act
    await addStaff(targetEmail);

    // Assert
    expect(audit.logAdminAction).toHaveBeenCalledWith('promote_staff', 'staff', {
      target_user_id: targetUserId,
      email: targetEmail,
    });
    expect(nextCache.revalidatePath).toHaveBeenCalledWith('/settings/staff');
  });

  it('should throw an error if the user is not found by email', async () => {
    // Arrange
    const superAdminId = 'super-admin-id';
    const targetEmail = 'notfound@example.com';

    setupSupabaseMock(
      { id: superAdminId },
      'superadmin',
      null, // No target user returned
      null,
      null
    );

    // Act & Assert
    await expect(addStaff(targetEmail)).rejects.toThrow(
      'User not found. Ensure they have signed up and their profile has an email set.'
    );

    expect(audit.logAdminAction).not.toHaveBeenCalled();
    expect(nextCache.revalidatePath).not.toHaveBeenCalled();
  });
});
