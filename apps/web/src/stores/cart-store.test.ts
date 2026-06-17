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

    addItem({
      id: '1',
      productId: 'p1',
      title: 'apple',
      price: 1,
      image: 'a.png',
      quantity: 1,
    });
    expect(useCartStore.getState().items).toEqual([
      {
        id: '1',
        productId: 'p1',
        title: 'apple',
        price: 1,
        image: 'a.png',
        quantity: 1,
      },
    ]);

    addItem({
      id: '2',
      productId: 'p2',
      title: 'banana',
      price: 1,
      image: 'b.png',
      quantity: 1,
    });
    expect(useCartStore.getState().items).toEqual([
      {
        id: '1',
        productId: 'p1',
        title: 'apple',
        price: 1,
        image: 'a.png',
        quantity: 1,
      },
      {
        id: '2',
        productId: 'p2',
        title: 'banana',
        price: 1,
        image: 'b.png',
        quantity: 1,
      },
    ]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem({
      id: '1',
      productId: 'p1',
      title: 'apple',
      price: 1,
      image: 'a.png',
      quantity: 1,
    });
    addItem({
      id: '2',
      productId: 'p2',
      title: 'banana',
      price: 1,
      image: 'b.png',
      quantity: 1,
    });

    removeItem('1');
    expect(useCartStore.getState().items).toEqual([
      {
        id: '2',
        productId: 'p2',
        title: 'banana',
        price: 1,
        image: 'b.png',
        quantity: 1,
      },
    ]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem({
      id: '1',
      productId: 'p1',
      title: 'apple',
      price: 1,
      image: 'a.png',
      quantity: 1,
    });
    addItem({
      id: '2',
      productId: 'p2',
      title: 'banana',
      price: 1,
      image: 'b.png',
      quantity: 1,
    });

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (removes all instances)', () => {
    // Current behavior documentation: removing an item removes ALL instances of that value
    const { addItem, removeItem } = useCartStore.getState();

    addItem({
      id: '1',
      productId: 'p1',
      title: 'apple',
      price: 1,
      image: 'a.png',
      quantity: 1,
    });
    addItem({
      id: '1',
      productId: 'p1',
      title: 'apple',
      price: 1,
      image: 'a.png',
      quantity: 1,
    });
    expect(useCartStore.getState().items).toEqual([
      {
        ...{
          id: '1',
          productId: 'p1',
          title: 'apple',
          price: 1,
          image: 'a.png',
          quantity: 1,
        },
        quantity: 2,
      },
    ]);

    removeItem('1');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem({
      id: '3',
      productId: 'p3',
      title: 'persistent-item',
      price: 1,
      image: 'p.png',
      quantity: 1,
    });

    const stored = localStorage.getItem('cart-storage');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([
        {
          id: '3',
          productId: 'p3',
          title: 'persistent-item',
          price: 1,
          image: 'p.png',
          quantity: 1,
        },
      ]);
    }
  });
});
