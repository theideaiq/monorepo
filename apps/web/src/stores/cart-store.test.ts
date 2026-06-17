import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type CartItem, useCartStore } from './cart-store';

// Helper to create mock items
const createMockItem = (
  overrides?: Partial<CartItem>,
): Omit<CartItem, 'quantity'> => ({
  id: '1',
  productId: 'p1',
  title: 'Test Product',
  price: 100,
  image: 'test.jpg',
  ...overrides,
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
    const item1 = createMockItem({ id: '1', title: 'Item 1', price: 100 });
    const item2 = createMockItem({ id: '2', title: 'Item 2', price: 200 });

    addItem(item1);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]).toEqual({ ...item1, quantity: 1 });
    expect(useCartStore.getState().total).toBe(100);

    addItem(item2);
    expect(useCartStore.getState().items).toHaveLength(2);
    expect(useCartStore.getState().total).toBe(300);
  });

  it('should increase quantity when adding existing item', () => {
    const { addItem } = useCartStore.getState();
    const item = createMockItem();

    addItem(item);
    addItem(item);

    const { items, total } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(total).toBe(200);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();
    const item1 = createMockItem({ id: '1' });
    const item2 = createMockItem({ id: '2' });

    addItem(item1);
    addItem(item2);

    removeItem('1');
    const { items, total } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('2');
    expect(total).toBe(100);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();
    const item = createMockItem();

    addItem(item);
    clearCart();

    const { items, total } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });

  it('should update quantity correctly', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    const item = createMockItem();

    addItem(item);
    updateQuantity(item.id, 5);

    const { items, total } = useCartStore.getState();
    expect(items[0].quantity).toBe(5);
    expect(total).toBe(500);
  });

  it('should ignore quantity updates less than 1', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    const item = createMockItem();

    addItem(item); // quantity starts at 1

    // Attempt to set to 0
    updateQuantity(item.id, 0);
    expect(useCartStore.getState().items[0].quantity).toBe(1);

    // Attempt to set to negative
    updateQuantity(item.id, -1);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const item = createMockItem({ id: 'persistent' });
    addItem(item);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).not.toBeNull();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items[0].id).toBe('persistent');
    }
  });
});
