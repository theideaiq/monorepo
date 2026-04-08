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

  const itemApple = { id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: '', quantity: 1 };
  const itemBanana = { id: 'banana', productId: 'p2', title: 'Banana', price: 5, image: '', quantity: 1 };
  const itemPersistent = { id: 'persistent-item', productId: 'p3', title: 'Persistent', price: 20, image: '', quantity: 1 };

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(itemApple);
    expect(useCartStore.getState().items).toEqual([itemApple]);

    addItem(itemBanana);
    expect(useCartStore.getState().items).toEqual([itemApple, itemBanana]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(itemApple);
    addItem(itemBanana);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([itemBanana]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(itemApple);
    addItem(itemBanana);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (increases quantity)', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(itemApple);
    addItem(itemApple);
    expect(useCartStore.getState().items).toEqual([{ ...itemApple, quantity: 2 }]);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(itemPersistent);

    const stored = localStorage.getItem('cart-storage');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([itemPersistent]);
    }
  });
});
