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

  const apple = { id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: 'apple.png' };
  const banana = { id: 'banana', productId: 'p2', title: 'Banana', price: 20, image: 'banana.png' };

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 1 }]);

    addItem(banana);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 1 }, { ...banana, quantity: 1 }]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(apple);
    addItem(banana);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([{ ...banana, quantity: 1 }]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(apple);
    addItem(banana);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should update the quantity of an existing item and recalculate total', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem(apple);
    addItem(banana);

    updateQuantity('apple', 3);

    const state = useCartStore.getState();
    expect(state.items).toEqual([
      { ...apple, quantity: 3 },
      { ...banana, quantity: 1 }
    ]);

    // total = (3 * 10) + (1 * 20) = 50
    expect(state.total).toBe(50);
  });

  it('should handle duplicate items correctly (removes all instances)', () => {
    // Current behavior documentation: removing an item removes ALL instances of that value
    const { addItem, removeItem } = useCartStore.getState();

    addItem(apple);
    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 2 }]);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const persistentItem = { id: 'persistent-item', productId: 'p3', title: 'Persistent Item', price: 30, image: 'persistent.png' };
    addItem(persistentItem);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...persistentItem, quantity: 1 }]);
    }
  });
});
