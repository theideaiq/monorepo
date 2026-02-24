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
    const apple = {
      id: 'apple',
      productId: 'p1',
      quantity: 1,
      price: 100,
      title: 'Apple',
      image: 'apple.png',
      maxQuantity: 10,
    };
    const banana = {
      id: 'banana',
      productId: 'p2',
      quantity: 1,
      price: 150,
      title: 'Banana',
      image: 'banana.png',
      maxQuantity: 10,
    };

    addItem(apple);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]).toMatchObject(apple);

    addItem(banana);
    expect(useCartStore.getState().items).toHaveLength(2);
    expect(useCartStore.getState().items[1]).toMatchObject(banana);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();
    const apple = {
      id: 'apple',
      productId: 'p1',
      quantity: 1,
      price: 100,
      title: 'Apple',
      image: 'apple.png',
      maxQuantity: 10,
    };
    const banana = {
      id: 'banana',
      productId: 'p2',
      quantity: 1,
      price: 150,
      title: 'Banana',
      image: 'banana.png',
      maxQuantity: 10,
    };

    addItem(apple);
    addItem(banana);

    removeItem('apple');
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].id).toBe('banana');
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();
    const apple = {
      id: 'apple',
      productId: 'p1',
      quantity: 1,
      price: 100,
      title: 'Apple',
      image: 'apple.png',
      maxQuantity: 10,
    };

    addItem(apple);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (increments quantity)', () => {
    const { addItem } = useCartStore.getState();
    const apple = {
      id: 'apple',
      productId: 'p1',
      quantity: 1,
      price: 100,
      title: 'Apple',
      image: 'apple.png',
      maxQuantity: 10,
    };

    addItem(apple);
    addItem(apple);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const item = {
      id: 'persistent-item',
      productId: 'p1',
      quantity: 1,
      price: 100,
      title: 'Item',
      image: 'item.png',
      maxQuantity: 10,
    };
    addItem(item);

    const stored = localStorage.getItem('cart-storage');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items[0]).toMatchObject(item);
    }
  });
});
