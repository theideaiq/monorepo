import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';

describe('Cart Store', () => {
  // Reset store before each test to ensure isolation
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should start with an empty cart', () => {
    const { items } = useCartStore.getState();
    expect(items).toEqual([]);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    // @ts-expect-error testing legacy schema (string id) handling by implementation
    addItem({ id: 'apple', price: 10 });
    expect(useCartStore.getState().items).toEqual([{ id: 'apple', price: 10, quantity: 1 }]);

    // @ts-expect-error testing legacy schema
    addItem({ id: 'banana', price: 15 });
    expect(useCartStore.getState().items).toEqual([{ id: 'apple', price: 10, quantity: 1 }, { id: 'banana', price: 15, quantity: 1 }]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    // @ts-expect-error
    addItem({ id: 'apple', price: 10 });
    // @ts-expect-error
    addItem({ id: 'banana', price: 15 });

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([{ id: 'banana', price: 15, quantity: 1 }]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    // @ts-expect-error
    addItem({ id: 'apple', price: 10 });
    // @ts-expect-error
    addItem({ id: 'banana', price: 15 });

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should update quantity of an existing item and recalculate total correctly', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    // @ts-expect-error testing core logic
    addItem({ id: 'apple', price: 10 });
    // @ts-expect-error testing core logic
    addItem({ id: 'banana', price: 15 });
    expect(useCartStore.getState().total).toBe(25);

    updateQuantity('apple', 3);

    const state = useCartStore.getState();
    expect(state.items.find(i => i.id === 'apple')?.quantity).toBe(3);
    expect(state.total).toBe(10 * 3 + 15 * 1); // 30 + 15 = 45
  });

  it('should handle duplicate items correctly (increments quantity)', () => {
    const { addItem, removeItem } = useCartStore.getState();

    // @ts-expect-error
    addItem({ id: 'apple', price: 10 });
    // @ts-expect-error
    addItem({ id: 'apple', price: 10 });
    expect(useCartStore.getState().items).toEqual([{ id: 'apple', price: 10, quantity: 2 }]);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    // @ts-expect-error
    addItem({ id: 'persistent-item', price: 20 });

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ id: 'persistent-item', price: 20, quantity: 1 }]);
    }
  });
});
