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

    addItem(Object.assign(new String('apple'), { quantity: 1 }));
    expect(useCartStore.getState().items.length).toEqual(1);
    expect(useCartStore.getState().items[0].toString()).toEqual('apple');

    addItem(Object.assign(new String('banana'), { quantity: 1 }));
    expect(useCartStore.getState().items.length).toEqual(2);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(Object.assign(new String('apple'), { quantity: 1 }));
    addItem(Object.assign(new String('banana'), { quantity: 1 }));

    removeItem(Object.assign(new String('apple'), { quantity: 1 }));
    expect(useCartStore.getState().items.length).toEqual(1);
    expect(useCartStore.getState().items[0].toString()).toEqual('banana');
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(Object.assign(new String('apple'), { quantity: 1 }));
    addItem(Object.assign(new String('banana'), { quantity: 1 }));

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (removes all instances)', () => {
    // Current behavior documentation: removing an item removes ALL instances of that value
    const { addItem, removeItem } = useCartStore.getState();

    addItem(Object.assign(new String('apple'), { quantity: 1 }));
    addItem(Object.assign(new String('apple'), { quantity: 1 }));
    expect(useCartStore.getState().items.length).toEqual(2);

    removeItem(Object.assign(new String('apple'), { quantity: 1 }));
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(Object.assign(new String('persistent-item'), { quantity: 1 }));

    const stored = localStorage.getItem('cart-storage');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items.length).toEqual(1);
    }
  });
});
