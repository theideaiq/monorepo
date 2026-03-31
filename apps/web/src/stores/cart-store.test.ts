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

  const itemA = { id: 'a', productId: 'p1', title: 'apple', price: 10, image: 'img1', quantity: 1 };
  const itemB = { id: 'b', productId: 'p2', title: 'banana', price: 15, image: 'img2', quantity: 1 };

  it('should add items to the cart and calculate totals', () => {
    const { addItem } = useCartStore.getState();

    addItem(itemA);
    expect(useCartStore.getState().items).toEqual([{ ...itemA }]);
    expect(useCartStore.getState().totalItems).toBe(1);
    expect(useCartStore.getState().total).toBe(10);

    addItem(itemB);
    expect(useCartStore.getState().items).toEqual([{ ...itemA }, { ...itemB }]);
    expect(useCartStore.getState().totalItems).toBe(2);
    expect(useCartStore.getState().total).toBe(25);
  });

  it('should update quantity of existing items and recalculate totals', () => {
    const { addItem } = useCartStore.getState();

    addItem(itemA);
    addItem(itemA); // adding same item again increases quantity

    expect(useCartStore.getState().items).toEqual([{ ...itemA, quantity: 2 }]);
    expect(useCartStore.getState().totalItems).toBe(2);
    expect(useCartStore.getState().total).toBe(20);
  });

  it('should remove items from the cart and recalculate totals', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(itemA);
    addItem(itemB);

    removeItem('a');
    expect(useCartStore.getState().items).toEqual([{ ...itemB }]);
    expect(useCartStore.getState().totalItems).toBe(1);
    expect(useCartStore.getState().total).toBe(15);
  });

  it('should clear the cart and reset totals', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(itemA);
    addItem(itemB);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().totalItems).toBe(0);
    expect(useCartStore.getState().total).toBe(0);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(itemA);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...itemA }]);
      expect(parsed.state.totalItems).toBe(1);
    }
  });
});
