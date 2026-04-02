import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';

describe('Cart Store', () => {
  const apple = { id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: 'apple.png' };
  const banana = { id: 'banana', productId: 'p2', title: 'Banana', price: 5, image: 'banana.png' };
  const persistentItem = { id: 'persistent-item', productId: 'p3', title: 'Persistent', price: 20, image: 'persistent.png' };

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

    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 1 }]);
    expect(useCartStore.getState().total).toBe(10);

    addItem(banana);
    expect(useCartStore.getState().items).toEqual([
      { ...apple, quantity: 1 },
      { ...banana, quantity: 1 }
    ]);
    expect(useCartStore.getState().total).toBe(15);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(apple);
    addItem(banana);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([{ ...banana, quantity: 1 }]);
    expect(useCartStore.getState().total).toBe(5);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(apple);
    addItem(banana);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
  });

  it('should handle duplicate items correctly (removes all instances)', () => {
    // In v2 with proper schema, adding duplicate ID increases quantity
    const { addItem, removeItem } = useCartStore.getState();

    addItem(apple);
    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 2 }]);
    expect(useCartStore.getState().total).toBe(20);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
  });

  it('should update item quantity and recalculate total correctly', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem(apple);
    addItem(banana);

    updateQuantity('apple', 3);

    const { items, total } = useCartStore.getState();
    expect(items).toEqual([
      { ...apple, quantity: 3 },
      { ...banana, quantity: 1 }
    ]);
    expect(total).toBe(35); // (10 * 3) + (5 * 1)
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(persistentItem);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...persistentItem, quantity: 1 }]);
      expect(parsed.state.total).toBe(20);
    }
  });
});
