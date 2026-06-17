import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type CartItem, useCartStore } from './cart-store';

const mockItemData: Omit<CartItem, 'quantity'> = {
  id: 'product-1',
  productId: 'prod-1',
  title: 'Apple',
  price: 1000,
  image: '/apple.png',
};

const mockItemData2: Omit<CartItem, 'quantity'> = {
  id: 'product-2',
  productId: 'prod-2',
  title: 'Banana',
  price: 500,
  image: '/banana.png',
};

describe('Cart Store', () => {
  // Reset store before each test to ensure isolation
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

    addItem(mockItemData);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]).toEqual({ ...mockItemData, quantity: 1 });
    expect(useCartStore.getState().total).toBe(1000);

    addItem(mockItemData2);
    expect(useCartStore.getState().items).toHaveLength(2);
    expect(useCartStore.getState().total).toBe(1500);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockItemData);
    addItem(mockItemData2);

    removeItem(mockItemData.id);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].id).toBe(mockItemData2.id);
    expect(useCartStore.getState().total).toBe(500);
  });

  it('should increment quantity when adding duplicate items', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItemData);
    addItem(mockItemData);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);
    expect(state.total).toBe(2000);
  });

  it('should update quantity manually', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    addItem(mockItemData);

    updateQuantity(mockItemData.id, 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
    expect(useCartStore.getState().total).toBe(5000);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(mockItemData);
    clearCart();

    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(mockItemData);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      // Zustand persist wraps state in { state: ... }
      expect(parsed.state.items).toHaveLength(1);
      expect(parsed.state.items[0].id).toBe(mockItemData.id);
    }
  });
});
