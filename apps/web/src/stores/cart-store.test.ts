import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';
import { createMockCartItem } from './test-utils';

describe('Cart Store', () => {
  // Reset store before each test to ensure isolation
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

  it('should add items to the cart and update total', () => {
    const { addItem } = useCartStore.getState();
    const item1 = createMockCartItem('1', 100);
    const item2 = createMockCartItem('2', 200);

    addItem(item1);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]).toMatchObject({ ...item1, quantity: 1 });
    expect(useCartStore.getState().total).toBe(100);

    addItem(item2);
    expect(useCartStore.getState().items).toHaveLength(2);
    expect(useCartStore.getState().total).toBe(300); // 100 + 200
  });

  it('should increment quantity if adding existing item', () => {
    const { addItem } = useCartStore.getState();
    const item1 = createMockCartItem('1', 100);

    addItem(item1);
    addItem(item1);

    const { items, total } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(total).toBe(200); // 100 * 2
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();
    const item1 = createMockCartItem('1', 100);
    const item2 = createMockCartItem('2', 200);

    addItem(item1);
    addItem(item2);

    removeItem('1');

    const { items, total } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('2');
    expect(total).toBe(200);
  });

  it('should update quantity of an item', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    const item1 = createMockCartItem('1', 100);

    addItem(item1); // quantity 1

    updateQuantity('1', 5);

    const { items, total } = useCartStore.getState();
    expect(items[0].quantity).toBe(5);
    expect(total).toBe(500); // 100 * 5
  });

  it('should not update quantity if less than 1', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    const item1 = createMockCartItem('1', 100);

    addItem(item1);

    updateQuantity('1', 0); // Should be ignored based on implementation

    const { items, total } = useCartStore.getState();
    expect(items[0].quantity).toBe(1);
    expect(total).toBe(100);

    updateQuantity('1', -1);
    expect(items[0].quantity).toBe(1);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();
    addItem(createMockCartItem('1', 100));

    clearCart();

    const { items, total } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });

  it('should persist state to localStorage with correct key', () => {
    const { addItem } = useCartStore.getState();
    addItem(createMockCartItem('persistent-item', 100));

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).not.toBeNull();

    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items[0].id).toBe('persistent-item');
      expect(parsed.state.total).toBe(100);
    }
  });
});
