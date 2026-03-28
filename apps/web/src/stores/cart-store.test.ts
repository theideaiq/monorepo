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

  const item1 = { id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: '' };
  const item2 = { id: 'banana', productId: 'p2', title: 'Banana', price: 20, image: '' };

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(item1);
    expect(useCartStore.getState().items).toEqual([{ ...item1, quantity: 1 }]);

    addItem(item2);
    expect(useCartStore.getState().items).toEqual([{ ...item1, quantity: 1 }, { ...item2, quantity: 1 }]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(item1);
    addItem(item2);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([{ ...item2, quantity: 1 }]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(item1);
    addItem(item2);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (increases quantity)', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(item1);
    addItem(item1);
    expect(useCartStore.getState().items).toEqual([{ ...item1, quantity: 2 }]);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const item3 = { id: 'persistent-item', productId: 'p3', title: 'Persist', price: 30, image: '' };
    addItem(item3);

    const stored = localStorage.getItem('cart-storage');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...item3, quantity: 1 }]);
    }
  });
});
