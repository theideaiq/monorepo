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

    const itemA = {
      id: 'apple',
      productId: 'p1',
      title: 'Apple',
      price: 10,
      image: 'a.png',
      quantity: 1,
    } as unknown as import('@/services/cart').CartItem;
    const itemB = {
      id: 'banana',
      productId: 'p2',
      title: 'Banana',
      price: 5,
      image: 'b.png',
      quantity: 1,
    } as unknown as import('@/services/cart').CartItem;

    addItem(itemA);
    expect(useCartStore.getState().items).toEqual([itemA]);

    addItem(itemB);
    expect(useCartStore.getState().items).toEqual([itemA, itemB]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    const itemA = {
      id: 'apple',
      productId: 'p1',
      title: 'Apple',
      price: 10,
      image: 'a.png',
      quantity: 1,
    } as unknown as import('@/services/cart').CartItem;
    const itemB = {
      id: 'banana',
      productId: 'p2',
      title: 'Banana',
      price: 5,
      image: 'b.png',
      quantity: 1,
    } as unknown as import('@/services/cart').CartItem;

    addItem(itemA);
    addItem(itemB);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([itemB]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    const itemA = {
      id: 'apple',
      productId: 'p1',
      title: 'Apple',
      price: 10,
      image: 'a.png',
      quantity: 1,
    } as unknown as import('@/services/cart').CartItem;
    const itemB = {
      id: 'banana',
      productId: 'p2',
      title: 'Banana',
      price: 5,
      image: 'b.png',
      quantity: 1,
    } as unknown as import('@/services/cart').CartItem;

    addItem(itemA);
    addItem(itemB);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (removes all instances)', () => {
    // Current behavior documentation: removing an item removes ALL instances of that value
    const { addItem, removeItem } = useCartStore.getState();

    const itemA = {
      id: 'apple',
      productId: 'p1',
      title: 'Apple',
      price: 10,
      image: 'a.png',
      quantity: 1,
    } as unknown as import('@/services/cart').CartItem;
    const itemA2 = {
      id: 'apple',
      productId: 'p1',
      title: 'Apple',
      price: 10,
      image: 'a.png',
      quantity: 2,
    } as unknown as import('@/services/cart').CartItem;

    addItem(itemA);
    addItem(itemA);
    expect(useCartStore.getState().items).toEqual([itemA2]);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const itemP = {
      id: 'persistent-item',
      productId: 'p3',
      title: 'Persistent',
      price: 15,
      image: 'p.png',
      quantity: 1,
    } as unknown as import('@/services/cart').CartItem;
    addItem(itemP);

    const stored = localStorage.getItem('cart-storage');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([itemP]);
    }
  });
});
