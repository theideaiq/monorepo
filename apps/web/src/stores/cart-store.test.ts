import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type CartItem, useCartStore } from './cart-store';

describe('Cart Store', () => {
  // Mock data
  const item1: Omit<CartItem, 'quantity'> = {
    id: 'p1_v1',
    productId: 'p1',
    title: 'Apple',
    price: 100,
    image: '/apple.png',
  };

  const item2: Omit<CartItem, 'quantity'> = {
    id: 'p2_v1',
    productId: 'p2',
    title: 'Banana',
    price: 150,
    image: '/banana.png',
  };

  // Reset store before each test to ensure isolation
  beforeEach(() => {
    useCartStore.setState({ items: [], total: 0, totalItems: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should start with an empty cart', () => {
    const { items, total, totalItems } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(total).toEqual(0);
    expect(totalItems).toEqual(0);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(item1);

    let state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({ ...item1, quantity: 1 });
    expect(state.total).toEqual(100);
    expect(state.totalItems).toEqual(1);

    addItem(item2);
    state = useCartStore.getState();
    expect(state.items).toHaveLength(2);
    expect(state.total).toEqual(250);
    expect(state.totalItems).toEqual(2);
  });

  it('should increment quantity when adding the same item', () => {
    const { addItem } = useCartStore.getState();

    addItem(item1);
    addItem(item1);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({ ...item1, quantity: 2 });
    expect(state.total).toEqual(200);
    expect(state.totalItems).toEqual(2);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(item1);
    addItem(item2);
    addItem(item1); // quantity of item1 is 2

    removeItem(item1.id);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({ ...item2, quantity: 1 });
    expect(state.total).toEqual(150);
    expect(state.totalItems).toEqual(1);
  });

  it('should update item quantity', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem(item1);
    updateQuantity(item1.id, 5);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({ ...item1, quantity: 5 });
    expect(state.total).toEqual(500);
    expect(state.totalItems).toEqual(5);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(item1);
    addItem(item2);

    clearCart();

    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.total).toEqual(0);
    expect(state.totalItems).toEqual(0);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(item1);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items[0].id).toEqual('p1_v1');
      expect(parsed.state.total).toEqual(100);
      expect(parsed.state.totalItems).toEqual(1);
    }
  });
});
