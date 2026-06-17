import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';

const itemA = {
  id: '1',
  productId: 'p1',
  title: 'Apple',
  price: 100,
  image: 'apple.jpg',
};

const itemB = {
  id: '2',
  productId: 'p2',
  title: 'Banana',
  price: 200,
  image: 'banana.jpg',
};

describe('Cart Store', () => {
  // Reset store before each test to ensure isolation
  beforeEach(() => {
    useCartStore.setState({ items: [], total: 0 });
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start with an empty cart', () => {
    const { items } = useCartStore.getState();
    expect(items).toEqual([]);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(itemA);
    expect(useCartStore.getState().items).toEqual([{ ...itemA, quantity: 1 }]);

    addItem(itemB);
    expect(useCartStore.getState().items).toEqual([
      { ...itemA, quantity: 1 },
      { ...itemB, quantity: 1 },
    ]);
  });

  it('should increment quantity when adding existing item', () => {
    const { addItem } = useCartStore.getState();

    addItem(itemA);
    addItem(itemA);
    expect(useCartStore.getState().items).toEqual([{ ...itemA, quantity: 2 }]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(itemA);
    addItem(itemB);

    removeItem(itemA.id);
    expect(useCartStore.getState().items).toEqual([{ ...itemB, quantity: 1 }]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(itemA);
    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(itemA);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...itemA, quantity: 1 }]);
    }
  });
});
