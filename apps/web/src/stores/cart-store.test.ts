import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type CartItem, useCartStore } from './cart-store';

describe('Cart Store', () => {
  const apple: Omit<CartItem, 'quantity'> = {
    id: '1',
    productId: 'p1',
    title: 'Apple',
    price: 10,
    image: 'apple.png',
  };
  const banana: Omit<CartItem, 'quantity'> = {
    id: '2',
    productId: 'p2',
    title: 'Banana',
    price: 20,
    image: 'banana.png',
  };

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

    removeItem(apple.id);
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
    const { addItem } = useCartStore.getState();

    addItem(apple);
    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 2 }]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(apple);

    const stored = localStorage.getItem('cart-storage');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...apple, quantity: 1 }]);
    }
  });
});
