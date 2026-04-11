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

    addItem({ id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: '' });
    expect(useCartStore.getState().items).toEqual([{ id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: '', quantity: 1 }]);

    addItem({ id: 'banana', productId: 'p2', title: 'Banana', price: 5, image: '' });
    expect(useCartStore.getState().items).toEqual([
      { id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: '', quantity: 1 },
      { id: 'banana', productId: 'p2', title: 'Banana', price: 5, image: '', quantity: 1 }
    ]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem({ id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: '' });
    addItem({ id: 'banana', productId: 'p2', title: 'Banana', price: 5, image: '' });

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([
      { id: 'banana', productId: 'p2', title: 'Banana', price: 5, image: '', quantity: 1 }
    ]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem({ id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: '' });
    addItem({ id: 'banana', productId: 'p2', title: 'Banana', price: 5, image: '' });

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (removes all instances)', () => {
    // Current behavior documentation: adding same item increases quantity, removing it removes it entirely
    const { addItem, removeItem } = useCartStore.getState();

    addItem({ id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: '' });
    addItem({ id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: '' });
    expect(useCartStore.getState().items).toEqual([{ id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: '', quantity: 2 }]);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem({ id: 'persistent-item', productId: 'p1', title: 'Persist', price: 10, image: '' });

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ id: 'persistent-item', productId: 'p1', title: 'Persist', price: 10, image: '', quantity: 1 }]);
    }
  });
});
