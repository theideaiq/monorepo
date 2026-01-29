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
      id: 'apple',
      productId: 'apple-id',
      title: 'Apple',
      price: 100,
      image: '',
    });
    expect(useCartStore.getState().items).toEqual([
      expect.objectContaining({ id: 'apple', quantity: 1 }),
    ]);

    addItem({
      id: 'banana',
      productId: 'banana-id',
      title: 'Banana',
      price: 100,
      image: '',
    });
    expect(useCartStore.getState().items).toEqual([
      expect.objectContaining({ id: 'apple' }),
      expect.objectContaining({ id: 'banana' }),
    ]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem({
      id: 'apple',
      productId: 'apple-id',
      title: 'Apple',
      price: 100,
      image: '',
    });
    addItem({
      id: 'banana',
      productId: 'banana-id',
      title: 'Banana',
      price: 100,
      image: '',
    });

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([
      expect.objectContaining({ id: 'banana' }),
    ]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem({
      id: 'apple',
      productId: 'apple-id',
      title: 'Apple',
      price: 100,
      image: '',
    });
    addItem({
      id: 'banana',
      productId: 'banana-id',
      title: 'Banana',
      price: 100,
      image: '',
    });

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (increments quantity)', () => {
    const { addItem } = useCartStore.getState();

    addItem({
      id: 'apple',
      productId: 'apple-id',
      title: 'Apple',
      price: 100,
      image: '',
    });
    addItem({
      id: 'apple',
      productId: 'apple-id',
      title: 'Apple',
      price: 100,
      image: '',
    });
    expect(useCartStore.getState().items).toEqual([
      expect.objectContaining({ id: 'apple', quantity: 2 }),
    ]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem({
      id: 'persistent-item',
      productId: 'p-id',
      title: 'Persistent',
      price: 100,
      image: '',
    });

    // Check with correct storage key (v2)
    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).not.toBeNull();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([
        expect.objectContaining({ id: 'persistent-item' }),
      ]);
    }
  });
});
