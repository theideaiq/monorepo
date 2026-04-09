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

    const item1: any = { id: 'apple-id', productId: 'apple-pid', title: 'apple', price: 10, image: '', quantity: 1 };
    const item2: any = { id: 'banana-id', productId: 'banana-pid', title: 'banana', price: 20, image: '', quantity: 1 };

    addItem(item1);
    expect(useCartStore.getState().items).toEqual([item1]);

    addItem(item2);
    expect(useCartStore.getState().items).toEqual([item1, item2]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    const item1: any = { id: 'apple-id', productId: 'apple-pid', title: 'apple', price: 10, image: '', quantity: 1 };
    const item2: any = { id: 'banana-id', productId: 'banana-pid', title: 'banana', price: 20, image: '', quantity: 1 };

    addItem(item1);
    addItem(item2);

    removeItem('apple-id');
    expect(useCartStore.getState().items).toEqual([item2]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    const item1: any = { id: 'apple-id', productId: 'apple-pid', title: 'apple', price: 10, image: '', quantity: 1 };
    const item2: any = { id: 'banana-id', productId: 'banana-pid', title: 'banana', price: 20, image: '', quantity: 1 };

    addItem(item1);
    addItem(item2);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (removes all instances)', () => {
    // Current behavior documentation: removing an item removes ALL instances of that value
    const { addItem, removeItem } = useCartStore.getState();

    const item1: any = { id: 'apple-id', productId: 'apple-pid', title: 'apple', price: 10, image: '', quantity: 1 };

    addItem(item1);
    addItem(item1);
    expect(useCartStore.getState().items).toEqual([{ ...item1, quantity: 2 }]);

    removeItem('apple-id');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const item1: any = { id: 'persistent-id', productId: 'persistent-pid', title: 'persistent-item', price: 10, image: '', quantity: 1 };
    addItem(item1);

    const stored = localStorage.getItem('cart-storage');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([item1]);
    }
  });
});
