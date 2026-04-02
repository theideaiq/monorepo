import * as nextCache from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Must mock server-only to avoid client-side error in test environment
vi.mock('server-only', () => ({}));

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

vi.mock('@/lib/audit', () => ({
  logAdminAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('staff actions - updateRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default setup for a successful role update by a superadmin
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'superadmin-id' } },
      error: null,
    } as any);

    const mockSingle = vi.fn().mockResolvedValue({
      data: { role: 'Superadmin', banned: false },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    // For the update itself
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

    mocks.supabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: mockSelect,
          update: mockUpdate,
        } as any;
      }
      return {} as any;
    });
  });

  it('should update role if requester is superadmin', async () => {
    // Act
    await updateRole('target-id', 'admin');

    // Assert
    expect(mocks.supabase.from).toHaveBeenCalledWith('profiles');

    // We can't easily assert on the exact chained calls without deeply mocking everything,
    // but we can check if logAdminAction was called, which indicates success
    expect(audit.logAdminAction).toHaveBeenCalledWith(
      'update_role',
      'staff',
      { new_role: 'admin', target_user_id: 'target-id' }
    );
    expect(nextCache.revalidatePath).toHaveBeenCalledWith('/settings/staff');
  });

  it('should throw error if requester is not superadmin', async () => {
    // Arrange - Make requester a regular admin
    const mockSingle = vi.fn().mockResolvedValue({
      data: { role: 'Admin', banned: false },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    mocks.supabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return { select: mockSelect } as any;
      }
      return {} as any;
    });

    // Act & Assert
    await expect(updateRole('target-id', 'admin')).rejects.toThrow(
      'Unauthorized: Insufficient permissions'
    );
  });

  it('should throw error if user is not authenticated', async () => {
    // Arrange
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);

    // Act & Assert
    await expect(updateRole('target-id', 'admin')).rejects.toThrow(
      'Authentication required: No user session found'
    );
  });
});
