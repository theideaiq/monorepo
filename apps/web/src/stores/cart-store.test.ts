import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';

describe('Cart Store', () => {
  // Reset store before each test to ensure isolation
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const mockItem1 = {
    id: '1',
    productId: 'p1',
    title: 'Apple',
    price: 100,
    image: '/apple.jpg',
  };

  const mockItem2 = {
    id: '2',
    productId: 'p2',
    title: 'Banana',
    price: 150,
    image: '/banana.jpg',
  };

  it('should start with an empty cart', () => {
    const { items } = useCartStore.getState();
    expect(items).toEqual([]);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItem1);
    expect(useCartStore.getState().items).toEqual([{ ...mockItem1, quantity: 1 }]);

    addItem(mockItem2);
    expect(useCartStore.getState().items).toEqual([
      { ...mockItem1, quantity: 1 },
      { ...mockItem2, quantity: 1 },
    ]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem2);

    removeItem(mockItem1.id);
    expect(useCartStore.getState().items).toEqual([{ ...mockItem2, quantity: 1 }]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem2);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (increments quantity)', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem1);
    expect(useCartStore.getState().items).toEqual([{ ...mockItem1, quantity: 2 }]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(mockItem1);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).not.toBeNull();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...mockItem1, quantity: 1 }]);
    }
  });
});
