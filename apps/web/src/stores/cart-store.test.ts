import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type CartItem, useCartStore } from './cart-store';

describe('Cart Store', () => {
  // Mock data matching the interface
  const MOCK_ITEM: CartItem = {
    id: 'prod-123',
    productId: 'p1',
    title: 'Apple',
    price: 100,
    image: '/apple.jpg',
    quantity: 1,
  };

  const MOCK_ITEM_2: CartItem = {
    id: 'prod-456',
    productId: 'p2',
    title: 'Banana',
    price: 50,
    image: '/banana.jpg',
    quantity: 1,
  };

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

  it('should add items to the cart and update total', () => {
    const { addItem } = useCartStore.getState();

    addItem(MOCK_ITEM);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual(MOCK_ITEM);
    expect(state.total).toBe(100);
  });

  it('should handle duplicate items by incrementing quantity', () => {
    const { addItem } = useCartStore.getState();

    addItem(MOCK_ITEM);
    addItem(MOCK_ITEM); // Add same item again

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);
    expect(state.total).toBe(200); // 100 * 2
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(MOCK_ITEM);
    addItem(MOCK_ITEM_2);

    expect(useCartStore.getState().items).toHaveLength(2);

    removeItem(MOCK_ITEM.id);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe(MOCK_ITEM_2.id);
    expect(state.total).toBe(50);
  });

  it('should update item quantity directly', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem(MOCK_ITEM);
    updateQuantity(MOCK_ITEM.id, 5);

    const state = useCartStore.getState();
    expect(state.items[0].quantity).toBe(5);
    expect(state.total).toBe(500); // 100 * 5
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(MOCK_ITEM);
    clearCart();

    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.total).toBe(0);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(MOCK_ITEM);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();

    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toHaveLength(1);
      expect(parsed.state.items[0].id).toBe(MOCK_ITEM.id);
    }
  });
});
