import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';

const mockItemA = {
  id: 'item-a',
  productId: 'prod-a',
  title: 'Apple',
  price: 1500,
  image: '/apple.jpg'
};

const mockItemB = {
  id: 'item-b',
  productId: 'prod-b',
  title: 'Banana',
  price: 500,
  image: '/banana.jpg'
};

describe('Cart Store', () => {
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

  it('should add items to the cart and calculate total correctly', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItemA);
    expect(useCartStore.getState().items).toEqual([{ ...mockItemA, quantity: 1 }]);
    expect(useCartStore.getState().total).toBe(1500);

    addItem(mockItemB);
    expect(useCartStore.getState().items).toEqual([
      { ...mockItemA, quantity: 1 },
      { ...mockItemB, quantity: 1 }
    ]);
    expect(useCartStore.getState().total).toBe(2000);
  });

  it('should handle duplicate items by increasing quantity', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItemA);
    addItem(mockItemA);

    expect(useCartStore.getState().items).toEqual([{ ...mockItemA, quantity: 2 }]);
    expect(useCartStore.getState().total).toBe(3000);
  });

  it('should remove items from the cart and update total', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockItemA);
    addItem(mockItemB);
    removeItem(mockItemA.id);

    expect(useCartStore.getState().items).toEqual([{ ...mockItemB, quantity: 1 }]);
    expect(useCartStore.getState().total).toBe(500);
  });

  it('should ignore updateQuantity when quantity is less than 1 (boundary case)', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem(mockItemA);
    updateQuantity(mockItemA.id, 0); // Invalid quantity
    updateQuantity(mockItemA.id, -5); // Invalid quantity

    // The store code returns `state` if quantity < 1, so it should stay at 1.
    expect(useCartStore.getState().items[0].quantity).toBe(1);
    expect(useCartStore.getState().total).toBe(1500);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(mockItemA);
    clearCart();

    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
  });
});
