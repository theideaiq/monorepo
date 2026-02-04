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

  const createMockItem = (
    id: string,
    price = 100,
  ): Omit<CartItem, 'quantity'> => ({
    id,
    productId: `prod-${id}`,
    title: `Product ${id}`,
    price,
    image: `img-${id}.jpg`,
  });

  it('should start with an empty cart', () => {
    const { items, total } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();
    const itemA = createMockItem('a', 50);
    const itemB = createMockItem('b', 100);

    addItem(itemA);
    const state1 = useCartStore.getState();
    expect(state1.items).toHaveLength(1);
    expect(state1.items[0]).toEqual({ ...itemA, quantity: 1 });
    expect(state1.total).toBe(50);

    addItem(itemB);
    const state2 = useCartStore.getState();
    expect(state2.items).toHaveLength(2);
    expect(state2.items[1]).toEqual({ ...itemB, quantity: 1 });
    expect(state2.total).toBe(150);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();
    const itemA = createMockItem('a');
    const itemB = createMockItem('b');

    addItem(itemA);
    addItem(itemB);

    removeItem('a');
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('b');
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();
    const itemA = createMockItem('a');

    addItem(itemA);

    clearCart();
    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.total).toBe(0);
  });

  it('should increment quantity for duplicate items', () => {
    const { addItem } = useCartStore.getState();
    const itemA = createMockItem('a', 100);

    addItem(itemA);
    addItem(itemA);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual({ ...itemA, quantity: 2 });
    expect(state.total).toBe(200);
  });

  it('should update quantity correctly', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    const itemA = createMockItem('a', 100);

    addItem(itemA);

    updateQuantity('a', 5);
    const state = useCartStore.getState();
    expect(state.items[0].quantity).toBe(5);
    expect(state.total).toBe(500);
  });

  it('should calculate total correctly', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    const itemA = createMockItem('a', 10);
    const itemB = createMockItem('b', 20);

    addItem(itemA); // 10
    addItem(itemB); // 20
    addItem(itemB); // 20 -> 40

    expect(useCartStore.getState().total).toBe(50);

    updateQuantity('a', 2); // 20
    expect(useCartStore.getState().total).toBe(60);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const itemA = createMockItem('persistent-item');
    addItem(itemA);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items[0].id).toBe('persistent-item');
    }
  });
});
