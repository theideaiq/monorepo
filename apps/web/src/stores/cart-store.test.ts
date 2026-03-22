import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';

const mockItem1 = {
  id: '1',
  productId: 'p1',
  title: 'apple',
  price: 10,
  image: 'img1',
};

const mockItem2 = {
  id: '2',
  productId: 'p2',
  title: 'banana',
  price: 20,
  image: 'img2',
};

describe('Cart Store', () => {
  // Reset store before each test to ensure isolation
  beforeEach(() => {
    useCartStore.setState({ items: [], total: 0, totalQuantity: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should start with an empty cart', () => {
    const { items, total, totalQuantity } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(total).toEqual(0);
    expect(totalQuantity).toEqual(0);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItem1);
    expect(useCartStore.getState().items).toEqual([{ ...mockItem1, quantity: 1 }]);
    expect(useCartStore.getState().total).toEqual(10);
    expect(useCartStore.getState().totalQuantity).toEqual(1);

    addItem(mockItem2);
    expect(useCartStore.getState().items).toEqual([
      { ...mockItem1, quantity: 1 },
      { ...mockItem2, quantity: 1 },
    ]);
    expect(useCartStore.getState().total).toEqual(30);
    expect(useCartStore.getState().totalQuantity).toEqual(2);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem2);

    removeItem('1');
    expect(useCartStore.getState().items).toEqual([{ ...mockItem2, quantity: 1 }]);
    expect(useCartStore.getState().total).toEqual(20);
    expect(useCartStore.getState().totalQuantity).toEqual(1);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem2);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toEqual(0);
    expect(useCartStore.getState().totalQuantity).toEqual(0);
  });

  it('should handle duplicate items correctly (increments quantity)', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem1);
    expect(useCartStore.getState().items).toEqual([{ ...mockItem1, quantity: 2 }]);
    expect(useCartStore.getState().total).toEqual(20);
    expect(useCartStore.getState().totalQuantity).toEqual(2);

    removeItem('1');
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toEqual(0);
    expect(useCartStore.getState().totalQuantity).toEqual(0);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(mockItem1);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...mockItem1, quantity: 1 }]);
    }
  });
});
