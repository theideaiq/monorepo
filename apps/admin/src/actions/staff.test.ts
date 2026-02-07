import * as nextCache from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as audit from '@/lib/audit';
import { updateRole } from './staff';

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

// Mock requireAdmin to rely on our supabase mock logic or override it per test
// But since the actual implementation of requireAdmin likely calls createClient,
// we just need to ensure createClient mock returns the right things.
// However, the error "Authentication required: No user session found" suggests
// requireAdmin might be checking for session presence explicitly.

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
    // If user is null, auth check should fail immediately
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user },
      error: user ? null : { message: 'No user session found' },
    });

    // Mock query builder chain
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: updateError }),
    });

    // Mock select chain for profile/role check
    // The implementation likely does: from('profiles').select('role').eq('id', user.id).single()
    const mockSingle = vi.fn();
    const mockEq = vi.fn();
    const mockSelect = vi.fn();

    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });

    // If user is authenticated, we return the profile
    if (user) {
      mockSingle.mockResolvedValue({
        // Return full profile object to satisfy potential destructuring
        // Ensure 'banned' is present as requireAdmin checks for it
        data: {
          id: user.id,
          role: requesterRole,
          banned: false,
          full_name: 'Test User',
          email: 'test@example.com'
        },
        error: null,
      });
    } else {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' },
      });
    }

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
    // The implementation throws 'Unauthorized: Insufficient permissions'
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
    // The implementation checks user existence first and throws 'Authentication required'
    await expect(updateRole('target-id', 'admin')).rejects.toThrow(
      'Authentication required',
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
