import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomNav } from './BottomNav';

// Mock dependencies
const mockUsePathname = vi.fn();
const mockToggleCart = vi.fn();
const mockUseCartStore = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('@/stores/ui-store', () => ({
  useUIStore: () => ({ toggleCart: mockToggleCart }),
}));

vi.mock('@/stores/cart-store', () => ({
  // biome-ignore lint/suspicious/noExplicitAny: Mocking selector
  useCartStore: (selector: any) => mockUseCartStore(selector),
}));

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks
    mockUsePathname.mockReturnValue('/');
    // biome-ignore lint/suspicious/noExplicitAny: Mocking selector
    mockUseCartStore.mockImplementation((selector: any) => {
      // simulate (s) => s.items
      return selector({ items: [] });
    });
  });

  it('renders navigation region', () => {
    render(<BottomNav />);
    const nav = screen.getByRole('navigation', { name: /mobile navigation/i });
    expect(nav).toBeInTheDocument();
  });

  it('indicates active link with aria-current="page"', () => {
    mockUsePathname.mockReturnValue('/');
    render(<BottomNav />);

    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toHaveAttribute('aria-current', 'page');

    const browseLink = screen.getByRole('link', { name: /browse/i });
    expect(browseLink).not.toHaveAttribute('aria-current');
  });

  it('updates active link based on pathname', () => {
    mockUsePathname.mockReturnValue('/megastore');
    render(<BottomNav />);

    const browseLink = screen.getByRole('link', { name: /browse/i });
    expect(browseLink).toHaveAttribute('aria-current', 'page');

    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).not.toHaveAttribute('aria-current');
  });

  it('displays correct cart item count in aria-label', () => {
    // Mock cart items
    const mockItems = [{ quantity: 2 }, { quantity: 1 }];
    // biome-ignore lint/suspicious/noExplicitAny: Mocking selector
    mockUseCartStore.mockImplementation((selector: any) => {
      return selector({ items: mockItems });
    });

    render(<BottomNav />);

    const cartButton = screen.getByRole('button', { name: /cart, 3 items/i });
    expect(cartButton).toBeInTheDocument();
  });

  it('hides badge from screen readers', () => {
    // Mock cart items
    const mockItems = [{ quantity: 5 }];
    // biome-ignore lint/suspicious/noExplicitAny: Mocking selector
    mockUseCartStore.mockImplementation((selector: any) => {
      return selector({ items: mockItems });
    });

    render(<BottomNav />);

    // The badge contains the text "5"
    const badge = screen.getByText('5');
    expect(badge).toHaveAttribute('aria-hidden', 'true');
  });
});
