import { render, screen } from '@testing-library/react';
import { CartDrawer } from './CartDrawer';
import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the stores
vi.mock('@/stores/cart-store');
vi.mock('@/stores/ui-store');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
// Mock Image since it's Next.js
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

describe('CartDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cart items with accessible buttons', () => {
    (useUIStore as any).mockReturnValue({
      isCartOpen: true,
      closeCart: vi.fn(),
    });

    (useCartStore as any).mockReturnValue({
      items: [
        {
          id: '1',
          title: 'Test Product',
          price: 1000,
          quantity: 1,
          image: '/test.jpg',
        },
      ],
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      total: 1000,
    });

    render(<CartDrawer />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();

    // These assertions should fail initially because the labels are missing
    const removeButton = screen.getByRole('button', { name: /remove test product/i });
    expect(removeButton).toBeInTheDocument();

    const decreaseButton = screen.getByRole('button', { name: /decrease quantity of test product/i });
    expect(decreaseButton).toBeInTheDocument();

    const increaseButton = screen.getByRole('button', { name: /increase quantity of test product/i });
    expect(increaseButton).toBeInTheDocument();
  });
});
