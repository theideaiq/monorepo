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

  it('should start with an empty cart', () => {
    const { items } = useCartStore.getState();
    expect(items).toEqual([]);
  });

  const mockItem1 = {
    id: '1',
    productId: 'p1',
    title: 'apple',
    price: 10,
    image: 'apple.png',
  };
  const mockItem2 = {
    id: '2',
    productId: 'p2',
    title: 'banana',
    price: 5,
    image: 'banana.png',
  };

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItem1);
    expect(useCartStore.getState().items).toEqual([
      { ...mockItem1, quantity: 1 },
    ]);

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

    removeItem('1');
    expect(useCartStore.getState().items).toEqual([
      { ...mockItem2, quantity: 1 },
    ]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem2);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (increases quantity)', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem1);
    expect(useCartStore.getState().items).toEqual([
      { ...mockItem1, quantity: 2 },
    ]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(mockItem1);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...mockItem1, quantity: 1 }]);
    }
  });
});
