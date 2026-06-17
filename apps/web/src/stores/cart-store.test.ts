import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';

const item1 = {
  id: '1',
  productId: 'p1',
  title: 'Apple',
  price: 100,
  image: 'apple.png',
};

const item2 = {
  id: '2',
  productId: 'p2',
  title: 'Banana',
  price: 200,
  image: 'banana.png',
};

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
    const { items } = useCartStore.getState();
    expect(items).toEqual([]);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(item1);
    expect(useCartStore.getState().items).toEqual([{ ...item1, quantity: 1 }]);
    expect(useCartStore.getState().total).toBe(100);

    addItem(item2);
    expect(useCartStore.getState().items).toEqual([
      { ...item1, quantity: 1 },
      { ...item2, quantity: 1 },
    ]);
    expect(useCartStore.getState().total).toBe(300);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(item1);
    addItem(item2);

    removeItem(item1.id);
    expect(useCartStore.getState().items).toEqual([{ ...item2, quantity: 1 }]);
    expect(useCartStore.getState().total).toBe(200);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(item1);
    addItem(item2);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
  });

  it('should handle duplicate items correctly (increments quantity)', () => {
    const { addItem } = useCartStore.getState();

    addItem(item1);
    addItem(item1);
    expect(useCartStore.getState().items).toEqual([{ ...item1, quantity: 2 }]);
    expect(useCartStore.getState().total).toBe(200);
  });

  it('should update quantity', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem(item1);
    updateQuantity(item1.id, 5);
    expect(useCartStore.getState().items).toEqual([{ ...item1, quantity: 5 }]);
    expect(useCartStore.getState().total).toBe(500);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(item1);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...item1, quantity: 1 }]);
    }
  });
});
