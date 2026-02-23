import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';

const ITEM_A = {
  id: 'product-1',
  productId: 'p1',
  title: 'Apple',
  price: 100,
  image: '/apple.jpg',
};

const ITEM_B = {
  id: 'product-2',
  productId: 'p2',
  title: 'Banana',
  price: 200,
  image: '/banana.jpg',
};

describe('Cart Store', () => {
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

    addItem(ITEM_A);
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual({ ...ITEM_A, quantity: 1 });
    expect(state.total).toBe(100);
  });

  it('should increment quantity when adding duplicate items', () => {
    const { addItem } = useCartStore.getState();

    addItem(ITEM_A);
    addItem(ITEM_A);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual({ ...ITEM_A, quantity: 2 });
    expect(state.total).toBe(200); // 100 * 2
  });

  it('should handle multiple different items', () => {
    const { addItem } = useCartStore.getState();

    addItem(ITEM_A);
    addItem(ITEM_B);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(2);
    expect(state.items.find((i) => i.id === ITEM_A.id)?.quantity).toBe(1);
    expect(state.items.find((i) => i.id === ITEM_B.id)?.quantity).toBe(1);
    expect(state.total).toBe(300); // 100 + 200
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(ITEM_A);
    addItem(ITEM_B);

    removeItem(ITEM_A.id);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe(ITEM_B.id);
    expect(state.total).toBe(200);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(ITEM_A);
    clearCart();

    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.total).toBe(0);
  });

  it('should update item quantity', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem(ITEM_A); // qty 1
    updateQuantity(ITEM_A.id, 5);

    const state = useCartStore.getState();
    expect(state.items[0].quantity).toBe(5);
    expect(state.total).toBe(500);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(ITEM_A);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toHaveLength(1);
      expect(parsed.state.items[0].id).toBe(ITEM_A.id);
    }
  });
});
