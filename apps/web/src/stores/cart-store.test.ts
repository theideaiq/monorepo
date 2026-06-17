import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';
import { createMockCartItem } from './test-utils';

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
    const { items, total } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();
    const item1 = createMockCartItem({ id: '1', title: 'Apple', price: 10 });
    const { quantity: _q1, ...item1Payload } = item1;

    addItem(item1Payload);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual({ ...item1, quantity: 1 });
    expect(state.total).toBe(10);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();
    const item1 = createMockCartItem({ id: '1', title: 'Apple' });
    const { quantity: _q1, ...item1Payload } = item1;

    addItem(item1Payload);
    removeItem('1');

    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.total).toBe(0);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();
    const item1 = createMockCartItem({ id: '1' });
    const { quantity: _q1, ...item1Payload } = item1;

    addItem(item1Payload);
    clearCart();

    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.total).toBe(0);
  });

  it('should increment quantity when adding duplicate items', () => {
    const { addItem } = useCartStore.getState();
    const item1 = createMockCartItem({ id: '1', price: 10 });
    const { quantity: _q1, ...item1Payload } = item1;

    addItem(item1Payload);
    addItem(item1Payload);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual({ ...item1, quantity: 2 });
    expect(state.total).toBe(20);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const item1 = createMockCartItem({ id: 'persistent' });
    const { quantity: _q1, ...item1Payload } = item1;

    addItem(item1Payload);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).not.toBeNull();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toHaveLength(1);
      expect(parsed.state.items[0].id).toBe('persistent');
    }
  });

  it('should calculate total correctly with multiple items', () => {
    const { addItem } = useCartStore.getState();

    const item1 = createMockCartItem({ id: '1', price: 10 }); // 10
    const { quantity: _q1, ...item1Payload } = item1;
    addItem(item1Payload);

    const item2 = createMockCartItem({ id: '2', price: 20 }); // 20
    const { quantity: _q2, ...item2Payload } = item2;
    addItem(item2Payload);

    addItem(item1Payload); // 10 + 20 + 10 = 40

    expect(useCartStore.getState().total).toBe(40);
  });

  it('should update item quantity', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    const item1 = createMockCartItem({ id: '1', price: 10 });
    const { quantity: _q1, ...item1Payload } = item1;
    addItem(item1Payload);

    updateQuantity('1', 5);

    const state = useCartStore.getState();
    expect(state.items[0].quantity).toBe(5);
    expect(state.total).toBe(50);
  });

  it('should ignore invalid quantity updates', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    const item1 = createMockCartItem({ id: '1', price: 10 });
    const { quantity: _q1, ...item1Payload } = item1;
    addItem(item1Payload);

    updateQuantity('1', 0); // Should be ignored

    const state = useCartStore.getState();
    expect(state.items[0].quantity).toBe(1);
    expect(state.total).toBe(10);

    updateQuantity('1', -5); // Should be ignored

    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });
});
