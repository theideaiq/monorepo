import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';
import type { CartItem } from './cart-store';

const mockItem: Omit<CartItem, 'quantity'> = {
  id: 'product-1',
  productId: 'prod-1',
  title: 'Test Product',
  price: 100,
  image: 'test-image.jpg',
};

const mockItem2: Omit<CartItem, 'quantity'> = {
  id: 'product-2',
  productId: 'prod-2',
  title: 'Another Product',
  price: 50,
  image: 'test-image-2.jpg',
};

describe('Cart Store', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], total: 0 });
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should start with an empty cart', () => {
    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.total).toBe(0);
  });

  it('should add a new item to the cart', () => {
    const { addItem } = useCartStore.getState();
    addItem(mockItem);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual({ ...mockItem, quantity: 1 });
    expect(state.total).toBe(100);
  });

  it('should increment quantity when adding an existing item', () => {
    const { addItem } = useCartStore.getState();
    addItem(mockItem);
    addItem(mockItem);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual({ ...mockItem, quantity: 2 });
    expect(state.total).toBe(200);
  });

  it('should remove an item from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();
    addItem(mockItem);
    addItem(mockItem2);

    removeItem(mockItem.id);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual({ ...mockItem2, quantity: 1 });
    expect(state.total).toBe(50);
  });

  it('should update quantity of an item', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    addItem(mockItem);

    updateQuantity(mockItem.id, 5);

    const state = useCartStore.getState();
    expect(state.items[0].quantity).toBe(5);
    expect(state.total).toBe(500);
  });

  it('should not update quantity if less than 1', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    addItem(mockItem); // quantity: 1

    updateQuantity(mockItem.id, 0);

    const state = useCartStore.getState();
    expect(state.items[0].quantity).toBe(1); // Should remain 1
    expect(state.total).toBe(100);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();
    addItem(mockItem);
    addItem(mockItem2);

    clearCart();

    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.total).toBe(0);
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
      expect(parsed.state.total).toBe(100);
    }
  });
});
