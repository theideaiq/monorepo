import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as cartStoreModule from '@/stores/cart-store';
import * as uiStoreModule from '@/stores/ui-store';
import { CartDrawer } from './CartDrawer';

// Mocks
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

// Mock react-dom createPortal
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

// Mock stores
const mockRemoveItem = vi.fn();
const mockUpdateQuantity = vi.fn();
const mockCloseCart = vi.fn();

vi.mock('@/stores/cart-store', () => ({
  useCartStore: vi.fn(),
}));

vi.mock('@/stores/ui-store', () => ({
  useUIStore: vi.fn(),
}));

describe('CartDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default UI Store state
    (uiStoreModule.useUIStore as any).mockImplementation((selector: any) => {
      const state = {
        isCartOpen: true,
        closeCart: mockCloseCart,
      };
      return selector ? selector(state) : state;
    });
  });

  it('renders empty cart message when no items', () => {
    (cartStoreModule.useCartStore as any).mockImplementation(
      (selector: any) => {
        const state = {
          items: [],
          removeItem: mockRemoveItem,
          updateQuantity: mockUpdateQuantity,
          total: 0,
        };
        return selector ? selector(state) : state;
      },
    );

    render(<CartDrawer />);
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
  });

  it('renders cart items correctly', () => {
    const items = [
      {
        id: '1',
        productId: 'p1',
        title: 'Test Product',
        price: 1000,
        image: '/test.jpg',
        quantity: 2,
        attributes: { Size: 'M' },
      },
    ];

    (cartStoreModule.useCartStore as any).mockImplementation(
      (selector: any) => {
        const state = {
          items,
          removeItem: mockRemoveItem,
          updateQuantity: mockUpdateQuantity,
          total: 2000,
        };
        return selector ? selector(state) : state;
      },
    );

    render(<CartDrawer />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('2,000 IQD')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // quantity
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('calls removeItem when trash button is clicked', () => {
    const items = [
      {
        id: '1',
        productId: 'p1',
        title: 'Test Product',
        price: 1000,
        image: '/test.jpg',
        quantity: 1,
      },
    ];
    (cartStoreModule.useCartStore as any).mockImplementation(
      (selector: any) => {
        const state = {
          items,
          removeItem: mockRemoveItem,
          updateQuantity: mockUpdateQuantity,
          total: 1000,
        };
        return selector ? selector(state) : state;
      },
    );

    const { container } = render(<CartDrawer />);

    const trashButton = container.querySelector('button.hover\\:text-red-500');
    expect(trashButton).toBeInTheDocument();
    fireEvent.click(trashButton!);

    expect(mockRemoveItem).toHaveBeenCalledWith('1');
  });

  it('calls updateQuantity when +/- buttons are clicked', () => {
    const items = [
      {
        id: '1',
        productId: 'p1',
        title: 'Test Product',
        price: 1000,
        image: '/test.jpg',
        quantity: 2,
      },
    ];
    (cartStoreModule.useCartStore as any).mockImplementation(
      (selector: any) => {
        const state = {
          items,
          removeItem: mockRemoveItem,
          updateQuantity: mockUpdateQuantity,
          total: 2000,
        };
        return selector ? selector(state) : state;
      },
    );

    const { container } = render(<CartDrawer />);

    const quantityButtons = container.querySelectorAll(
      'button.p-1.text-slate-400',
    );

    const minusBtn = quantityButtons[0];
    const plusBtn = quantityButtons[1];

    fireEvent.click(plusBtn);
    expect(mockUpdateQuantity).toHaveBeenCalledWith('1', 3);

    fireEvent.click(minusBtn);
    expect(mockUpdateQuantity).toHaveBeenCalledWith('1', 1);
  });
});
