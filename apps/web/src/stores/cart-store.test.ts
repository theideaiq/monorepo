import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type CartItem, useCartStore } from './cart-store';

const createMockItem = (id: string, price: number): Omit<CartItem, 'quantity'> => ({
  id,
  productId: `prod-${id}`,
  title: `Product ${id}`,
  price,
  image: `img-${id}.jpg`,
});

describe('Cart Store', () => {
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
    expect(state.items[0]).toMatchObject({ ...item1, quantity: 1 });
    expect(state.total).toBe(100);
  });

  it('should increment quantity if item already exists', () => {
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
    expect(useCartStore.getState().items).toHaveLength(2);

    removeItem('1');
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('2');
    expect(state.total).toBe(200);
  });

  it('should update item quantity', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    const item1 = createMockItem('1', 100);

    addItem(item1); // qty 1

    updateQuantity('1', 5);
    let state = useCartStore.getState();
    expect(state.items[0].quantity).toBe(5);
    expect(state.total).toBe(500);

    // Boundary check: update to 0 should be ignored (based on code analysis)
    updateQuantity('1', 0);
    state = useCartStore.getState();
    expect(state.items[0].quantity).toBe(5);

    // Boundary check: update to -1 should be ignored
    updateQuantity('1', -1);
    state = useCartStore.getState();
    expect(state.items[0].quantity).toBe(5);
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
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toHaveLength(1);
      expect(parsed.state.items[0].id).toBe('1');
    }
  });
});
