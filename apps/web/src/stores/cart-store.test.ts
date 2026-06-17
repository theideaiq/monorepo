import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type CartItem, useCartStore } from './cart-store';

// Helper to create mock items
const createMockItem = (overrides?: Partial<CartItem>): Omit<CartItem, 'quantity'> => ({
  id: 'item-1',
  productId: 'prod-1',
  title: 'Test Product',
  price: 100,
  image: 'test.jpg',
  ...overrides,
});

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

  it('should add a new item to the cart', () => {
    const { addItem } = useCartStore.getState();
    const newItem = createMockItem({ id: '1', title: 'Apple', price: 50 });

    addItem(newItem);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual({ ...newItem, quantity: 1 });
    expect(state.total).toBe(50);
  });

  it('should increment quantity if adding existing item', () => {
    const { addItem } = useCartStore.getState();
    const item = createMockItem({ id: '1', price: 50 });

    addItem(item);
    addItem(item);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);
    expect(state.total).toBe(100);
  });

  it('should remove an item by id', () => {
    const { addItem, removeItem } = useCartStore.getState();
    const item1 = createMockItem({ id: '1', price: 10 });
    const item2 = createMockItem({ id: '2', price: 20 });

    addItem(item1);
    addItem(item2);

    expect(useCartStore.getState().items).toHaveLength(2);

    removeItem('1');

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('2');
    expect(state.total).toBe(20);
  });

  it('should update item quantity', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    const item = createMockItem({ id: '1', price: 10 });

    addItem(item);
    updateQuantity('1', 5);

    const state = useCartStore.getState();
    expect(state.items[0].quantity).toBe(5);
    expect(state.total).toBe(50);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();
    addItem(createMockItem());

    clearCart();

    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.total).toBe(0);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const item = createMockItem({ id: 'persisted', price: 99 });

    addItem(item);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();

    if (stored) {
      const parsed = JSON.parse(stored);
      // zustand persist structure: { state: { ... }, version: ... }
      expect(parsed.state.items).toHaveLength(1);
      expect(parsed.state.items[0].id).toBe('persisted');
      expect(parsed.state.total).toBe(99);
    }
  });
});
