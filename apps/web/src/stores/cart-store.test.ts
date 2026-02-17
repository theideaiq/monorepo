import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';

const mockItem1 = {
  id: 'item-1',
  productId: 'prod-1',
  title: 'Apple',
  price: 100,
  image: 'apple.jpg',
};

const mockItem2 = {
  id: 'item-2',
  productId: 'prod-2',
  title: 'Banana',
  price: 50,
  image: 'banana.jpg',
};

describe('Cart Store', () => {
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

    addItem(mockItem1);
    const state1 = useCartStore.getState();
    expect(state1.items).toHaveLength(1);
    expect(state1.items[0]).toMatchObject({ ...mockItem1, quantity: 1 });
    expect(state1.total).toBe(100);

    addItem(mockItem2);
    const state2 = useCartStore.getState();
    expect(state2.items).toHaveLength(2);
    expect(state2.items[1]).toMatchObject({ ...mockItem2, quantity: 1 });
    expect(state2.total).toBe(150);
  });

  it('should increase quantity for existing items', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem1);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({ ...mockItem1, quantity: 2 });
    expect(state.total).toBe(200);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem2);

    removeItem(mockItem1.id);
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe(mockItem2.id);
    expect(state.total).toBe(50);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem2);

    clearCart();
    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.total).toBe(0);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(mockItem1);

    // zustand persist middleware uses 'cart-storage-v2' as defined in store
    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toHaveLength(1);
      expect(parsed.state.items[0].id).toBe(mockItem1.id);
    }
  });
});
