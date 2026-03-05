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

    const apple = { id: '1', productId: 'p1', title: 'apple', price: 100, image: 'app.jpg' };
    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 1 }]);

    const banana = { id: '2', productId: 'p2', title: 'banana', price: 200, image: 'ban.jpg' };
    addItem(banana);
    expect(useCartStore.getState().items).toEqual([
      { ...apple, quantity: 1 },
      { ...banana, quantity: 1 }
    ]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    const apple = { id: '1', productId: 'p1', title: 'apple', price: 100, image: 'app.jpg' };
    const banana = { id: '2', productId: 'p2', title: 'banana', price: 200, image: 'ban.jpg' };
    addItem(apple);
    addItem(banana);

    removeItem('1');
    expect(useCartStore.getState().items).toEqual([{ ...banana, quantity: 1 }]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    const apple = { id: '1', productId: 'p1', title: 'apple', price: 100, image: 'app.jpg' };
    addItem(apple);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (increases quantity)', () => {
    const { addItem } = useCartStore.getState();

    const apple = { id: '1', productId: 'p1', title: 'apple', price: 100, image: 'app.jpg' };
    addItem(apple);
    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 2 }]);
  });

  it('should update quantity correctly', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    const apple = { id: '1', productId: 'p1', title: 'apple', price: 100, image: 'app.jpg' };
    addItem(apple);

    updateQuantity('1', 5);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 5 }]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const item = { id: 'p', productId: 'px', title: 'persistent', price: 10, image: 'p.jpg' };
    addItem(item);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...item, quantity: 1 }]);
    }
  });
});
