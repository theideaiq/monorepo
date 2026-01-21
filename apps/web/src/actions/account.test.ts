import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateProfile } from './account';

const mocks = vi.hoisted(() => {
  return {
    getUser: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    from: vi.fn(),
  };
});

// Setup mock return values/chaining
mocks.from.mockReturnValue({ update: mocks.update });
mocks.update.mockReturnValue({ eq: mocks.eq });

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('updateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks for happy path
    mocks.eq.mockResolvedValue({ error: null });
    // Reset chain mocks in case they were altered
    mocks.from.mockReturnValue({ update: mocks.update });
    mocks.update.mockReturnValue({ eq: mocks.eq });
  });

  it('should update profile and revalidate path when authenticated and input is valid', async () => {
    // Arrange
    const userId = 'user-123';
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId } } });

    const formData = new FormData();
    formData.append('fullName', 'John Doe');

    // Act
    await updateProfile(formData);

    // Assert
    expect(mocks.getUser).toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledWith('profiles');
    expect(mocks.update).toHaveBeenCalledWith({ full_name: 'John Doe' });
    expect(mocks.eq).toHaveBeenCalledWith('id', userId);
    expect(revalidatePath).toHaveBeenCalledWith('/[locale]/account', 'page');
  });

  it('should throw error when user is not authenticated', async () => {
    // Arrange
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const formData = new FormData();
    formData.append('fullName', 'John Doe');

    // Act & Assert
    await expect(updateProfile(formData)).rejects.toThrow('Not authenticated');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('should throw error when fullName is missing', async () => {
    // Arrange
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    const formData = new FormData();
    // No fullName appended

    // Act & Assert
    await expect(updateProfile(formData)).rejects.toThrow(
      'Full name is required',
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('should throw error when database update fails', async () => {
    // Arrange
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    const formData = new FormData();
    formData.append('fullName', 'John Doe');

    mocks.eq.mockResolvedValue({ error: { message: 'DB Error' } });

    // Act & Assert
    await expect(updateProfile(formData)).rejects.toThrow(
      'Failed to update profile',
    );
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
