import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartDrawer } from './CartDrawer';
import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';

// Mock the stores
vi.mock('@/stores/cart-store', () => ({
  useCartStore: vi.fn(),
}));

vi.mock('@/stores/ui-store', () => ({
  useUIStore: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ fill, ...props }: any) => <img {...props} />,
}));

describe('CartDrawer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders correctly when open and has items', () => {
    // Setup store mocks
    (useUIStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isCartOpen: true,
      closeCart: vi.fn(),
    });

    (useCartStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      items: [
        {
          id: '1',
          title: 'Test Product',
          price: 1000,
          quantity: 2,
          image: '/test.jpg',
        },
      ],
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      total: 2000,
    });

    render(<CartDrawer />);

    // Check for accessibility labels
    expect(screen.getByLabelText('Close drawer')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Test Product from cart')).toBeInTheDocument();
    expect(screen.getByLabelText('Decrease quantity for Test Product')).toBeInTheDocument();
    expect(screen.getByLabelText('Increase quantity for Test Product')).toBeInTheDocument();
  });
});
