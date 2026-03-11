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

    const item1 = {
      id: 'apple',
      productId: 'p1',
      title: 'Apple',
      price: 10,
      image: 'apple.png',
    };
    addItem(item1);
    expect(useCartStore.getState().items).toEqual([{ ...item1, quantity: 1 }]);

    const item2 = {
      id: 'banana',
      productId: 'p2',
      title: 'Banana',
      price: 5,
      image: 'banana.png',
    };
    addItem(item2);
    expect(useCartStore.getState().items).toEqual([
      { ...item1, quantity: 1 },
      { ...item2, quantity: 1 },
    ]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    const item1 = {
      id: 'apple',
      productId: 'p1',
      title: 'Apple',
      price: 10,
      image: 'apple.png',
    };
    const item2 = {
      id: 'banana',
      productId: 'p2',
      title: 'Banana',
      price: 5,
      image: 'banana.png',
    };

    addItem(item1);
    addItem(item2);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([{ ...item2, quantity: 1 }]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    const item1 = {
      id: 'apple',
      productId: 'p1',
      title: 'Apple',
      price: 10,
      image: 'apple.png',
    };
    const item2 = {
      id: 'banana',
      productId: 'p2',
      title: 'Banana',
      price: 5,
      image: 'banana.png',
    };

    addItem(item1);
    addItem(item2);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
  });

  it('should handle duplicate items correctly (increases quantity)', () => {
    const { addItem, removeItem } = useCartStore.getState();

    const item = {
      id: 'apple',
      productId: 'p1',
      title: 'Apple',
      price: 10,
      image: 'apple.png',
    };
    addItem(item);
    addItem(item);
    expect(useCartStore.getState().items).toEqual([{ ...item, quantity: 2 }]);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should calculate the total correctly when quantities change', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    const item1 = {
      id: 'item1',
      productId: 'p1',
      title: 'Product 1',
      price: 100,
      image: 'img1.png',
    };
    const item2 = {
      id: 'item2',
      productId: 'p2',
      title: 'Product 2',
      price: 50,
      image: 'img2.png',
    };

    addItem(item1); // quantity 1, total 100
    expect(useCartStore.getState().total).toBe(100);

    addItem(item2); // quantity 1, total 150
    expect(useCartStore.getState().total).toBe(150);

    updateQuantity('item1', 3); // item1 quantity 3 -> 300 + 50 = 350
    expect(useCartStore.getState().total).toBe(350);

    // updateQuantity ignores quantity < 1 and returns current state
    updateQuantity('item2', 0); // ignored, total remains 350
    expect(useCartStore.getState().total).toBe(350);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const item = {
      id: 'persistent-item',
      productId: 'p1',
      title: 'Persistent',
      price: 20,
      image: 'img.png',
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
