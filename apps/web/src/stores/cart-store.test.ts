import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';
import type { CartItem } from './cart-store';

const createMockItem = (id: string, price: number): Omit<CartItem, 'quantity'> => ({
  id,
  productId: `prod-${id}`,
  title: `Product ${id}`,
  price,
  image: `img-${id}.jpg`,
});

describe('Cart Store', () => {
  // Reset store before each test to ensure isolation
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
    const item1 = createMockItem('1', 100);

    addItem(item1);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual({ ...item1, quantity: 1 });
    expect(state.total).toBe(100);
  });

  it('should increment quantity for existing items', () => {
    const { addItem } = useCartStore.getState();
    const item1 = createMockItem('1', 100);

    addItem(item1);
    addItem(item1);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);
    expect(state.total).toBe(200);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();
    const item1 = createMockItem('1', 100);
    const item2 = createMockItem('2', 200);

    addItem(item1);
    addItem(item2);

    removeItem('1');

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('2');
    expect(state.total).toBe(200);
  });

  it('should update item quantity', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    const item1 = createMockItem('1', 100);

    addItem(item1);
    updateQuantity('1', 5);

    const state = useCartStore.getState();
    expect(state.items[0].quantity).toBe(5);
    expect(state.total).toBe(500);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();
    const item1 = createMockItem('1', 100);

    addItem(item1);
    clearCart();

    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.total).toBe(0);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const item1 = createMockItem('1', 100);

    addItem(item1);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).not.toBeNull();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toHaveLength(1);
      expect(parsed.state.items[0].id).toBe('1');
    }
  });
});
