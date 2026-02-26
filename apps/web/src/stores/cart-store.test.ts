import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';

const apple = {
  id: 'apple',
  productId: 'apple-id',
  title: 'Apple',
  price: 100,
  image: 'apple.png',
};

const banana = {
  id: 'banana',
  productId: 'banana-id',
  title: 'Banana',
  price: 200,
  image: 'banana.png',
};

describe('Cart Store', () => {
  // Reset store before each test to ensure isolation
  beforeEach(() => {
    useCartStore.setState({ items: [], total: 0 });
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

    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 1 }]);

    addItem(banana);
    expect(useCartStore.getState().items).toEqual([
      { ...apple, quantity: 1 },
      { ...banana, quantity: 1 },
    ]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(apple);
    addItem(banana);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([{ ...banana, quantity: 1 }]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(apple);
    addItem(banana);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (increments quantity)', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(apple);
    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 2 }]);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(apple);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...apple, quantity: 1 }]);
    }
  });
});
