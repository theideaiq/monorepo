import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';

describe('Cart Store', () => {
  // Reset store before each test to ensure isolation
  beforeEach(() => {
    useCartStore.setState({ items: [], total: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const mockItemApple = {
    id: 'apple',
    productId: 'p-1',
    title: 'Apple',
    price: 10,
    image: 'apple.png',
  };

  const mockItemBanana = {
    id: 'banana',
    productId: 'p-2',
    title: 'Banana',
    price: 20,
    image: 'banana.png',
  };

  it('should start with an empty cart', () => {
    const { items, total } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItemApple);
    expect(useCartStore.getState().items).toEqual([
      { ...mockItemApple, quantity: 1 },
    ]);
    expect(useCartStore.getState().total).toBe(10);

    addItem(mockItemBanana);
    expect(useCartStore.getState().items).toEqual([
      { ...mockItemApple, quantity: 1 },
      { ...mockItemBanana, quantity: 1 },
    ]);
    expect(useCartStore.getState().total).toBe(30);
  });

  it('should update quantity and recalculate total correctly', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem(mockItemApple); // Qty 1, Total 10

    updateQuantity('apple', 3);

    const { items, total } = useCartStore.getState();
    expect(items).toEqual([
      { ...mockItemApple, quantity: 3 },
    ]);
    expect(total).toBe(30);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockItemApple);
    addItem(mockItemBanana);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([
      { ...mockItemBanana, quantity: 1 },
    ]);
    expect(useCartStore.getState().total).toBe(20);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(mockItemApple);
    addItem(mockItemBanana);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
  });

  it('should handle duplicate items correctly (increases quantity)', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockItemApple);
    addItem(mockItemApple);
    expect(useCartStore.getState().items).toEqual([
      { ...mockItemApple, quantity: 2 },
    ]);
    expect(useCartStore.getState().total).toBe(20);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(mockItemApple);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...mockItemApple, quantity: 1 }]);
    }
  });
});
