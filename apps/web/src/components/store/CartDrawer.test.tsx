import { render, screen, fireEvent } from '@testing-library/react';
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
  useRouter: () => ({ push: vi.fn() }),
}));

describe('CartDrawer', () => {
  const mockRemoveItem = vi.fn();
  const mockUpdateQuantity = vi.fn();
  const mockCloseCart = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useUIStore as any).mockReturnValue({
      isCartOpen: true,
      closeCart: mockCloseCart,
    });
  });

  it('renders correctly with an empty cart', () => {
    (useCartStore as any).mockReturnValue({
      items: [],
      removeItem: mockRemoveItem,
      updateQuantity: mockUpdateQuantity,
      total: 0,
    });

    render(<CartDrawer />);
    expect(screen.getByText(/Your cart is empty/i)).toBeDefined();
  });

  it('renders correctly with items and has aria-labels on buttons', () => {
    (useCartStore as any).mockReturnValue({
      items: [
        {
          id: '1',
          productId: 'prod1',
          title: 'Test Product',
          price: 1000,
          quantity: 2,
          image: '/test.jpg',
        },
      ],
      removeItem: mockRemoveItem,
      updateQuantity: mockUpdateQuantity,
      total: 2000,
    });

    render(<CartDrawer />);

    expect(screen.getByText('Test Product')).toBeDefined();

    // Check for aria-labels
    const removeButton = screen.getByLabelText('Remove Test Product from cart');
    expect(removeButton).toBeDefined();

    const decreaseButton = screen.getByLabelText('Decrease quantity of Test Product');
    expect(decreaseButton).toBeDefined();

    const increaseButton = screen.getByLabelText('Increase quantity of Test Product');
    expect(increaseButton).toBeDefined();

    // Test interactions
    fireEvent.click(removeButton);
    expect(mockRemoveItem).toHaveBeenCalledWith('1');

    fireEvent.click(decreaseButton);
    expect(mockUpdateQuantity).toHaveBeenCalledWith('1', 1);

    fireEvent.click(increaseButton);
    expect(mockUpdateQuantity).toHaveBeenCalledWith('1', 3);
  });
});
