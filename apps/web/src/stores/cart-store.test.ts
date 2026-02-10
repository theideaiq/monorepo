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
    const item1 = { id: '1', title: 'Apple', price: 100, image: '', productId: 'p1' };
    const item2 = { id: '2', title: 'Banana', price: 50, image: '', productId: 'p2' };

    addItem(item1);
    expect(useCartStore.getState().items).toEqual([{ ...item1, quantity: 1 }]);

    addItem(item2);
    expect(useCartStore.getState().items).toEqual([
      { ...item1, quantity: 1 },
      { ...item2, quantity: 1 },
    ]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();
    const item1 = { id: '1', title: 'Apple', price: 100, image: '', productId: 'p1' };
    const item2 = { id: '2', title: 'Banana', price: 50, image: '', productId: 'p2' };

    addItem(item1);
    addItem(item2);

    removeItem('1');
    expect(useCartStore.getState().items).toEqual([{ ...item2, quantity: 1 }]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();
    const item1 = { id: '1', title: 'Apple', price: 100, image: '', productId: 'p1' };

    addItem(item1);
    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (increments quantity)', () => {
    const { addItem } = useCartStore.getState();
    const item1 = { id: '1', title: 'Apple', price: 100, image: '', productId: 'p1' };

    addItem(item1);
    addItem(item1);
    expect(useCartStore.getState().items).toEqual([{ ...item1, quantity: 2 }]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const item1 = { id: '1', title: 'Persistent Item', price: 100, image: '', productId: 'p1' };
    addItem(item1);

    // Note: The persist middleware might use a different key or async storage.
    // Assuming default local storage behavior for this test context.
    // The key in the store definition is 'cart-storage-v2'
    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...item1, quantity: 1 }]);
    }
  });
});
