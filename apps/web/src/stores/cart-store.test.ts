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
  // Reset store before each test
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

  it('should add a new item to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItem1);

    const { items, total } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ ...mockItem1, quantity: 1 });
    expect(total).toBe(100);
  });

  it('should increment quantity if item already exists', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem1);

    const { items, total } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(total).toBe(200);
  });

  it('should add multiple different items', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem2);

    const { items, total } = useCartStore.getState();
    expect(items).toHaveLength(2);
    expect(total).toBe(150);
  });

  it('should remove an item from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem2);

    removeItem(mockItem1.id);

    const { items, total } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(mockItem2.id);
    expect(total).toBe(50);
  });

  it('should update item quantity', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem(mockItem1);
    updateQuantity(mockItem1.id, 5);

    const { items, total } = useCartStore.getState();
    expect(items[0].quantity).toBe(5);
    expect(total).toBe(500);
  });

  it('should not update quantity below 1', () => {
     const { addItem, updateQuantity } = useCartStore.getState();
     addItem(mockItem1);
     updateQuantity(mockItem1.id, 0);

     const { items } = useCartStore.getState();
     expect(items[0].quantity).toBe(1);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(mockItem1);
    clearCart();

    const { items, total } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });
});
