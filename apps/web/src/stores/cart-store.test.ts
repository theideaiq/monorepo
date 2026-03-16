import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';

describe('Cart Store', () => {
  const appleItem = {
    id: 'apple',
    productId: 'p1',
    title: 'Apple',
    price: 10,
    image: 'apple.png',
  };
  const bananaItem = {
    id: 'banana',
    productId: 'p2',
    title: 'Banana',
    price: 20,
    image: 'banana.png',
  };

  beforeEach(() => {
    useCartStore.setState({ items: [], total: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should start with an empty cart', () => {
    const { items, total } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(appleItem);
    expect(useCartStore.getState().items).toEqual([
      { ...appleItem, quantity: 1 },
    ]);
    expect(useCartStore.getState().total).toBe(10);

    addItem(bananaItem);
    expect(useCartStore.getState().items).toEqual([
      { ...appleItem, quantity: 1 },
      { ...bananaItem, quantity: 1 },
    ]);
    expect(useCartStore.getState().total).toBe(30);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(appleItem);
    addItem(bananaItem);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([
      { ...bananaItem, quantity: 1 },
    ]);
    expect(useCartStore.getState().total).toBe(20);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(appleItem);
    addItem(bananaItem);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
  });

  it('should handle duplicate items correctly (removes all instances)', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(appleItem);
    addItem(appleItem);
    expect(useCartStore.getState().items).toEqual([
      { ...appleItem, quantity: 2 },
    ]);
    expect(useCartStore.getState().total).toBe(20);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
  });

  it('should update the quantity of an item', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem(appleItem);
    updateQuantity('apple', 5);

    expect(useCartStore.getState().items[0].quantity).toBe(5);
    expect(useCartStore.getState().total).toBe(50);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem({ ...appleItem, id: 'persistent-item' });

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([
        { ...appleItem, id: 'persistent-item', quantity: 1 },
      ]);
    }
  });
});
