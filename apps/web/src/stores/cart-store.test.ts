import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';

describe('Cart Store', () => {
  // Reset store before each test to ensure isolation
  beforeEach(() => {
    useCartStore.setState({ items: [], total: 0, totalItems: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should start with an empty cart', () => {
    const { items, totalItems } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(totalItems).toEqual(0);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem({ id: '1', productId: 'p1', title: 'apple', price: 10, quantity: 1, image: '' });
    expect(useCartStore.getState().items[0].title).toEqual('apple');
    expect(useCartStore.getState().totalItems).toEqual(1);

    addItem({ id: '2', productId: 'p2', title: 'banana', price: 5, quantity: 1, image: '' });
    expect(useCartStore.getState().items.length).toEqual(2);
    expect(useCartStore.getState().totalItems).toEqual(2);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem({ id: '1', productId: 'p1', title: 'apple', price: 10, quantity: 1, image: '' });
    addItem({ id: '2', productId: 'p2', title: 'banana', price: 5, quantity: 1, image: '' });

    removeItem('1');
    expect(useCartStore.getState().items.length).toEqual(1);
    expect(useCartStore.getState().items[0].title).toEqual('banana');
    expect(useCartStore.getState().totalItems).toEqual(1);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem({ id: '1', productId: 'p1', title: 'apple', price: 10, quantity: 1, image: '' });
    addItem({ id: '2', productId: 'p2', title: 'banana', price: 5, quantity: 1, image: '' });

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().totalItems).toEqual(0);
  });

  it('should handle duplicate items correctly (increments quantity)', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem({ id: '1', productId: 'p1', title: 'apple', price: 10, quantity: 1, image: '' });
    addItem({ id: '1', productId: 'p1', title: 'apple', price: 10, quantity: 1, image: '' });
    expect(useCartStore.getState().items.length).toEqual(1);
    expect(useCartStore.getState().items[0].quantity).toEqual(2);
    expect(useCartStore.getState().totalItems).toEqual(2);

    removeItem('1');
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().totalItems).toEqual(0);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem({ id: '1', productId: 'p1', title: 'persistent-item', price: 10, quantity: 1, image: '' });

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items[0].title).toEqual('persistent-item');
      expect(parsed.state.totalItems).toEqual(1);
    }
  });
});
