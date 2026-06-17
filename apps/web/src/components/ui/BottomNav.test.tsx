import { render, screen } from '@testing-library/react';
import { BottomNav } from './BottomNav';
import { vi, describe, it, expect } from 'vitest';

// Mock dependencies
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

vi.mock('@/stores/ui-store', () => ({
  useUIStore: vi.fn(() => ({
    toggleCart: vi.fn(),
  })),
}));

// Mock cart store to return 3 items total (2 + 1)
vi.mock('@/stores/cart-store', () => ({
  useCartStore: vi.fn((selector) => selector({
    items: [
      { id: '1', quantity: 2, price: 100 },
      { id: '2', quantity: 1, price: 200 }
    ]
  })),
}));

describe('BottomNav', () => {
  it('has aria-current="page" on the active link', () => {
    render(<BottomNav />);
    // Since we mocked usePathname to return '/', the Home link should be active
    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toHaveAttribute('aria-current', 'page');
  });

  it('has correct aria-label on cart button including item count', () => {
    render(<BottomNav />);
    // We expect "Cart, 3 items" because 2+1=3
    // We search by generic "cart" first to find the button
    // Note: The current implementation has text "Cart" inside it, so getByRole('button', { name: /cart/i }) should find it.
    const cartButton = screen.getByRole('button', { name: /cart/i });
    expect(cartButton).toHaveAttribute('aria-label', 'Cart, 3 items');
  });
});
