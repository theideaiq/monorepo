import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartDrawer } from './CartDrawer';
import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock Image
vi.mock('next/image', () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

describe('CartDrawer', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], total: 0 });
    useUIStore.setState({ isCartOpen: true });
  });

  it('renders items and handles quantity updates', () => {
    useCartStore.setState({
      items: [
        {
          id: '1',
          productId: 'p1',
          title: 'Test Product',
          price: 1000,
          image: '/test.jpg',
          quantity: 1,
        },
      ],
      total: 1000,
    });

    render(<CartDrawer />);

    expect(screen.getByText('Test Product')).toBeDefined();

    // Find increment button (plus)
    const plusBtn = screen.getByLabelText('Increase quantity');
    fireEvent.click(plusBtn);

    // Check store state
    expect(useCartStore.getState().items[0].quantity).toBe(2);

    // Find decrement button
    const minusBtn = screen.getByLabelText('Decrease quantity');
    fireEvent.click(minusBtn);

    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it('removes item when trash button is clicked', () => {
    useCartStore.setState({
      items: [
        {
          id: '1',
          productId: 'p1',
          title: 'Test Product',
          price: 1000,
          image: '/test.jpg',
          quantity: 1,
        },
      ],
      total: 1000,
    });

    render(<CartDrawer />);

    const removeBtn = screen.getByLabelText('Remove item');
    fireEvent.click(removeBtn);

    expect(useCartStore.getState().items).toEqual([]);
  });
});
