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
      productId: 'apple-id',
      title: 'Apple',
      price: 1,
      image: '',
    };
    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 1 }]);

    const banana = {
      id: 'banana',
      productId: 'banana-id',
      title: 'Banana',
      price: 2,
      image: '',
    };
    addItem(banana);
    expect(useCartStore.getState().items).toEqual([
      { ...apple, quantity: 1 },
      { ...banana, quantity: 1 },
    ]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    const apple = {
      id: 'apple',
      productId: 'apple-id',
      title: 'Apple',
      price: 1,
      image: '',
    };
    const banana = {
      id: 'banana',
      productId: 'banana-id',
      title: 'Banana',
      price: 2,
      image: '',
    };

    addItem(apple);
    addItem(banana);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([{ ...banana, quantity: 1 }]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    const apple = {
      id: 'apple',
      productId: 'apple-id',
      title: 'Apple',
      price: 1,
      image: '',
    };
    const banana = {
      id: 'banana',
      productId: 'banana-id',
      title: 'Banana',
      price: 2,
      image: '',
    };

    addItem(apple);
    addItem(banana);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (increments quantity)', () => {
    const { addItem, removeItem } = useCartStore.getState();

    const apple = {
      id: 'apple',
      productId: 'apple-id',
      title: 'Apple',
      price: 1,
      image: '',
    };
    addItem(apple);
    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 2 }]);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const item = {
      id: 'persistent-item',
      productId: 'persistent-id',
      title: 'Item',
      price: 1,
      image: '',
    };
    addItem(item);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...item, quantity: 1 }]);
    }
  });
});
