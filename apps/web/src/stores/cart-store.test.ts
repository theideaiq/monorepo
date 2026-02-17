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

  const mockItem1: Omit<CartItem, 'quantity'> = {
    id: 'apple',
    productId: 'p1',
    title: 'Apple',
    price: 100,
    image: '',
  };

  const mockItem2: Omit<CartItem, 'quantity'> = {
    id: 'banana',
    productId: 'p2',
    title: 'Banana',
    price: 200,
    image: '',
  };

  it('should start with an empty cart', () => {
    const { items } = useCartStore.getState();
    expect(items).toEqual([]);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItem1);
    expect(useCartStore.getState().items).toEqual([
      { ...mockItem1, quantity: 1 },
    ]);

    addItem(mockItem2);
    expect(useCartStore.getState().items).toEqual([
      { ...mockItem1, quantity: 1 },
      { ...mockItem2, quantity: 1 },
    ]);
  });

  it('should increment quantity if adding existing item', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem1);
    expect(useCartStore.getState().items).toEqual([
      { ...mockItem1, quantity: 2 },
    ]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem2);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([
      { ...mockItem2, quantity: 1 },
    ]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem2);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(mockItem1);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...mockItem1, quantity: 1 }]);
    }
  });

  it('should calculate total correctly', () => {
    const { addItem } = useCartStore.getState();
    addItem(mockItem1); // 100
    addItem(mockItem2); // 200
    addItem(mockItem1); // +100 = 400

    expect(useCartStore.getState().total).toBe(400);
  });
});
