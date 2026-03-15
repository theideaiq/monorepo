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

    const apple = { id: 'apple', productId: 'p1', title: 'apple', price: 10, image: '', quantity: 1 };
    addItem(apple);
    expect(useCartStore.getState().items).toEqual([apple]);

    const banana = { id: 'banana', productId: 'p2', title: 'banana', price: 20, image: '', quantity: 1 };
    addItem(banana);
    expect(useCartStore.getState().items).toEqual([apple, banana]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    const apple = { id: 'apple', productId: 'p1', title: 'apple', price: 10, image: '', quantity: 1 };
    const banana = { id: 'banana', productId: 'p2', title: 'banana', price: 20, image: '', quantity: 1 };
    addItem(apple);
    addItem(banana);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([banana]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    const apple = { id: 'apple', productId: 'p1', title: 'apple', price: 10, image: '', quantity: 1 };
    const banana = { id: 'banana', productId: 'p2', title: 'banana', price: 20, image: '', quantity: 1 };
    addItem(apple);
    addItem(banana);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly', () => {
    const { addItem, removeItem } = useCartStore.getState();

    const apple = { id: 'apple', productId: 'p1', title: 'apple', price: 10, image: '', quantity: 1 };
    addItem(apple);
    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 2 }]);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should update item quantity correctly', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    const apple = { id: 'apple', productId: 'p1', title: 'apple', price: 10, image: '', quantity: 1 };
    addItem(apple);

    updateQuantity('apple', 5);

    const state = useCartStore.getState();
    expect(state.items).toEqual([{ ...apple, quantity: 5 }]);
    expect(state.total).toBe(50);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const item = { id: 'persistent-item', productId: 'p1', title: 'item', price: 10, image: '', quantity: 1 };
    addItem(item);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([item]);
    }
  });
});
