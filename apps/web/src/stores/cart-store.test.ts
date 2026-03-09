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

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();
    const item1 = { id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: '', quantity: 1 };
    const item2 = { id: 'banana', productId: 'p2', title: 'Banana', price: 20, image: '', quantity: 1 };

    addItem(item1 as any);
    expect(useCartStore.getState().items).toEqual([item1]);

    addItem(item2 as any);
    expect(useCartStore.getState().items).toEqual([item1, item2]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();
    const item1 = { id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: '', quantity: 1 };
    const item2 = { id: 'banana', productId: 'p2', title: 'Banana', price: 20, image: '', quantity: 1 };

    addItem(item1 as any);
    addItem(item2 as any);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([item2]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();
    const item1 = { id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: '', quantity: 1 };
    const item2 = { id: 'banana', productId: 'p2', title: 'Banana', price: 20, image: '', quantity: 1 };

    addItem(item1 as any);
    addItem(item2 as any);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (removes all instances)', () => {
    // Current behavior documentation: removing an item removes ALL instances of that value
    const { addItem, removeItem } = useCartStore.getState();
    const item1 = { id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: '', quantity: 1 };
    const item1Double = { id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: '', quantity: 2 };

    addItem(item1 as any);
    addItem(item1 as any);
    expect(useCartStore.getState().items).toEqual([item1Double]);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const item = { id: 'persistent-item', productId: 'p1', title: 'Item', price: 10, image: '', quantity: 1 };
    addItem(item as any);

    const stored = localStorage.getItem('cart-storage');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([item]);
    }
  });
});
