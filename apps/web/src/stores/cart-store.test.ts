import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type CartItem, useCartStore } from './cart-store';

describe('Cart Store', () => {
  // Reset store before each test to ensure isolation
  beforeEach(() => {
    useCartStore.setState({ items: [], total: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const mockItem: Omit<CartItem, 'quantity'> = {
    id: 'apple-id',
    productId: 'apple',
    title: 'Apple',
    price: 100,
    image: 'apple.png',
  };

  const mockItem2: Omit<CartItem, 'quantity'> = {
    id: 'banana-id',
    productId: 'banana',
    title: 'Banana',
    price: 50,
    image: 'banana.png',
  };

  it('should start with an empty cart', () => {
    const { items } = useCartStore.getState();
    expect(items).toEqual([]);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItem);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]).toMatchObject({
      ...mockItem,
      quantity: 1,
    });

    addItem(mockItem2);
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('should increment quantity if item already exists', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItem);
    addItem(mockItem);

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]).toMatchObject({
      ...mockItem,
      quantity: 2,
    });
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockItem);
    addItem(mockItem2);

    removeItem(mockItem.id);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]).toMatchObject(mockItem2);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(mockItem);
    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(mockItem);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toHaveLength(1);
      expect(parsed.state.items[0].id).toBe(mockItem.id);
    }
  });
});
