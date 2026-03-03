import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type CartItem, useCartStore } from './cart-store';

describe('Cart Store', () => {
  const createMockItem = (
    id: string,
    price = 10,
  ): Omit<CartItem, 'quantity'> => ({
    id,
    productId: `prod-${id}`,
    title: `Product ${id}`,
    price,
    image: `https://example.com/${id}.jpg`,
  });

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
    const apple = createMockItem('apple', 5);
    const banana = createMockItem('banana', 3);

    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 1 }]);
    expect(useCartStore.getState().total).toBe(5);

    addItem(banana);
    expect(useCartStore.getState().items).toEqual([
      { ...apple, quantity: 1 },
      { ...banana, quantity: 1 },
    ]);
    expect(useCartStore.getState().total).toBe(8);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();
    const apple = createMockItem('apple', 5);
    const banana = createMockItem('banana', 3);

    addItem(apple);
    addItem(banana);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([{ ...banana, quantity: 1 }]);
    expect(useCartStore.getState().total).toBe(3);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();
    const apple = createMockItem('apple', 5);
    const banana = createMockItem('banana', 3);

    addItem(apple);
    addItem(banana);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
  });

  it('should handle duplicate items correctly (increases quantity)', () => {
    const { addItem, removeItem } = useCartStore.getState();
    const apple = createMockItem('apple', 5);

    addItem(apple);
    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 2 }]);
    expect(useCartStore.getState().total).toBe(10);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const item = createMockItem('persistent-item', 15);
    addItem(item);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...item, quantity: 1 }]);
    }
  });

  it('should correctly update quantity and total', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    const apple = createMockItem('apple', 5);

    addItem(apple);
    expect(useCartStore.getState().total).toBe(5);

    updateQuantity('apple', 3);

    const state = useCartStore.getState();
    expect(state.items).toEqual([{ ...apple, quantity: 3 }]);
    expect(state.total).toBe(15);

    // Test boundary value: should not go below 1 (handled by returning state untouched in implementation)
    updateQuantity('apple', 0);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 3 }]);
    expect(useCartStore.getState().total).toBe(15);
  });
});
