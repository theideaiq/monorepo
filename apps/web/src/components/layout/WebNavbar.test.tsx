import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WebNavbar } from './WebNavbar';

// Mock dependencies
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

vi.mock('@/stores/ui-store', () => ({
  useUIStore: () => ({
    toggleCart: vi.fn(),
  }),
}));

// Mock useCartStore
// We need to support both selector usage and direct usage if any
const mockUseCartStore = vi.fn();
vi.mock('@/stores/cart-store', () => ({
  useCartStore: (selector: any) => mockUseCartStore(selector),
}));

describe('WebNavbar', () => {
  it('renders cart badge with correct count', async () => {
    // Setup mock store state
    const mockItems = [
      { id: '1', quantity: 2, price: 100 },
      { id: '2', quantity: 3, price: 200 },
    ];

    // Mock implementation: Apply selector to state
    mockUseCartStore.mockImplementation((selector) => {
      const state = { items: mockItems };
      // If component uses selector, execute it. If not (returns state), handle that too (though typical zustand usage is with selector or full state)
      return selector ? selector(state) : state;
    });

    render(<WebNavbar navItems={[]} />);

    // Expect total quantity: 2 + 3 = 5
    // The badge is only shown after mount (useEffect)
    const badge = await screen.findByText('5');
    expect(badge).toBeInTheDocument();
  });

  it('does not render badge if cart is empty', async () => {
    mockUseCartStore.mockImplementation((selector) => {
      const state = { items: [] };
      return selector ? selector(state) : state;
    });

    render(<WebNavbar navItems={[]} />);

    // Wait for effect
    await new Promise((r) => setTimeout(r, 0));

    // Badge should not be found
    const badge = screen.queryByText(/[0-9]+/);
    expect(badge).not.toBeInTheDocument();
  });
});
