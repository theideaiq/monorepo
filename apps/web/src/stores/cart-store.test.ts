import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { type CartItem, useCartStore } from './cart-store';

// Helper to create a mock cart item
const createMockItem = (id: string, title = 'Test Item'): CartItem => ({
  id,
  productId: `prod_${id}`,
  title,
  price: 100,
  image: '/test.jpg',
  quantity: 1, // Store default, though usually ignored by addItem
});

describe('Cart Store', () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({ items: [], total: 0 });
  });

  it('should start with an empty cart', () => {
    const { items, total } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();
    const item = createMockItem('1', 'Apple');

    act(() => {
      addItem(item);
    });

    const { items, total } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ ...item, quantity: 1 });
    expect(total).toBe(100);

    const item2 = createMockItem('2', 'Banana');
    act(() => {
      addItem(item2);
    });

    expect(useCartStore.getState().items).toHaveLength(2);
    expect(useCartStore.getState().total).toBe(200);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();
    const item1 = createMockItem('1', 'Apple');
    const item2 = createMockItem('2', 'Banana');

    act(() => {
      addItem(item1);
      addItem(item2);
    });

    expect(useCartStore.getState().items).toHaveLength(2);

    act(() => {
      removeItem('1');
    });

    const { items, total } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('2');
    expect(total).toBe(100);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();
    const item = createMockItem('1');

    act(() => {
      addItem(item);
      clearCart();
    });

    const { items, total } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });

  it('should handle duplicate items correctly (increments quantity)', () => {
    const { addItem } = useCartStore.getState();
    const item = createMockItem('1', 'Apple');

    act(() => {
      addItem(item);
      addItem(item);
    });

    const { items, total } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ ...item, quantity: 2 });
    expect(total).toBe(200); // 100 * 2
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const item = createMockItem('1');

    act(() => {
      addItem(item);
    });

    const storage = JSON.parse(localStorage.getItem('cart-storage-v2') || '{}');
    expect(storage.state.items).toHaveLength(1);
    expect(storage.state.items[0].id).toBe('1');
  });
});
