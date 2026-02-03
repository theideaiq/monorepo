import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';

describe('Cart Store', () => {
  const mockItem = {
    id: 'item-1',
    productId: 'prod-1',
    title: 'Test Product',
    price: 100,
    image: 'test.jpg',
  };

  const mockItem2 = {
    id: 'item-2',
    productId: 'prod-2',
    title: 'Test Product 2',
    price: 200,
    image: 'test2.jpg',
  };

  beforeEach(() => {
    useCartStore.setState({ items: [], total: 0 });
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start with an empty cart', () => {
    const { items, total } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItem);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual({ ...mockItem, quantity: 1 });
    expect(state.total).toBe(100);
  });

  it('should increment quantity when adding duplicate item', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItem);
    addItem(mockItem);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);
    expect(state.total).toBe(200);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockItem);
    addItem(mockItem2);

    removeItem(mockItem.id);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe(mockItem2.id);
    expect(state.total).toBe(200);
  });

  it('should update item quantity', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem(mockItem); // qty: 1, total: 100

    updateQuantity(mockItem.id, 5);

    const state = useCartStore.getState();
    expect(state.items[0].quantity).toBe(5);
    expect(state.total).toBe(500);
  });

  it('should not update quantity to less than 1', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    addItem(mockItem);
    updateQuantity(mockItem.id, 0);
    const state = useCartStore.getState();
    expect(state.items[0].quantity).toBe(1);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(mockItem);
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
      expect(parsed.state.items[0].id).toBe(mockItem.id);
    }
  });
});
