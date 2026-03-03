import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/client';
import LoginPage from './page';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock UI components
vi.mock('@repo/ui', () => ({
  Button: ({ children, isLoading, ...props }: any) => (
    <button {...props} disabled={isLoading}>
      {isLoading ? 'Loading...' : children}
    </button>
  ),
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  Input: ({ label, ...props }: any) => (
    <label>
      {label}
      <input {...props} />
    </label>
  ),
  Sheet: ({ children }: any) => <div>{children}</div>,
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetTrigger: ({ children }: any) => <div>{children}</div>,
}));

describe('LoginPage', () => {
  const mockPush = vi.fn();
  const mockRefresh = vi.fn();
  const mockSupabase = {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    });
    (createClient as any).mockReturnValue(mockSupabase);
  });

  const setupSupabaseMock = (
    signInData: any,
    signInError: any,
    profileData: any,
    profileError: any,
  ) => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: signInData,
      error: signInError,
    });

    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: profileData,
      error: profileError,
    });

    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    mockSupabase.from.mockReturnValue({ select: selectMock });
  };

  it('renders correctly', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/Email/i)).toBeDefined();
    expect(screen.getByLabelText(/Password/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeDefined();
  });

  it('handles successful login for superadmin', async () => {
    setupSupabaseMock(
      { user: { id: 'user-123' } },
      null,
      { role: 'superadmin' },
      null,
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Welcome back, Admin');
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('handles successful login for admin (case insensitive)', async () => {
    setupSupabaseMock(
      { user: { id: 'user-123' } },
      null,
      { role: 'Admin' }, // Capitalized to test case insensitivity
      null,
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Welcome back, Admin');
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('denies access if profile not found', async () => {
    setupSupabaseMock(
      { user: { id: 'user-123' } },
      null,
      null, // Profile not found
      null,
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Profile not found for this user.',
      );
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  it('denies access if profile fetch fails', async () => {
    setupSupabaseMock(
      { user: { id: 'user-123' } },
      null,
      null,
      { message: 'Database connection error' }, // Profile fetch error
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to verify permissions: Database connection error',
      );
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  it('denies access if role is user', async () => {
    setupSupabaseMock(
      { user: { id: 'user-123' } },
      null,
      { role: 'user' },
      null,
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Access Denied: Admin privileges required. Found role: user',
      );
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });
});
