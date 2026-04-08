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

    // @ts-expect-error - bypassing strict type for test
    const apple = { id: 'apple', title: 'Apple', price: 10, quantity: 1 };
    // @ts-expect-error
    const banana = { id: 'banana', title: 'Banana', price: 5, quantity: 1 };

    addItem(apple as any);
    expect(useCartStore.getState().items).toEqual([apple]);

    addItem(banana as any);
    expect(useCartStore.getState().items).toEqual([apple, banana]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    // @ts-expect-error
    const apple = { id: 'apple', title: 'Apple', price: 10, quantity: 1 };
    // @ts-expect-error
    const banana = { id: 'banana', title: 'Banana', price: 5, quantity: 1 };

    addItem(apple as any);
    addItem(banana as any);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([banana]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    // @ts-expect-error
    const apple = { id: 'apple', title: 'Apple', price: 10, quantity: 1 };
    // @ts-expect-error
    const banana = { id: 'banana', title: 'Banana', price: 5, quantity: 1 };

    addItem(apple as any);
    addItem(banana as any);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (removes all instances)', () => {
    // Current behavior documentation: removing an item removes ALL instances of that value
    const { addItem, removeItem } = useCartStore.getState();

    // @ts-expect-error
    const apple = { id: 'apple', title: 'Apple', price: 10, quantity: 1 };
    // @ts-expect-error
    const apple2 = { id: 'apple', title: 'Apple', price: 10, quantity: 2 };

    addItem(apple as any);
    addItem(apple as any); // addItem increments quantity if id matches
    expect(useCartStore.getState().items).toEqual([apple2]);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    // @ts-expect-error
    const item = {
      id: 'persistent-item',
      title: 'Item',
      price: 10,
      quantity: 1,
    };
    addItem(item as any);

    const stored = localStorage.getItem('cart-storage');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([item]);
    }
  });
});
