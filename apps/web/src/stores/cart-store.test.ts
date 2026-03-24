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

  const itemApple = {
    id: 'apple',
    productId: 'prod-1',
    title: 'Apple',
    price: 10,
    image: 'apple.png',
  };

  const itemBanana = {
    id: 'banana',
    productId: 'prod-2',
    title: 'Banana',
    price: 15,
    image: 'banana.png',
  };

  it('should start with an empty cart', () => {
    const { items } = useCartStore.getState();
    expect(items).toEqual([]);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(itemApple);
    expect(useCartStore.getState().items).toEqual([
      { ...itemApple, quantity: 1 },
    ]);

    addItem(itemBanana);
    expect(useCartStore.getState().items).toEqual([
      { ...itemApple, quantity: 1 },
      { ...itemBanana, quantity: 1 },
    ]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(itemApple);
    addItem(itemBanana);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([
      { ...itemBanana, quantity: 1 },
    ]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(itemApple);
    addItem(itemBanana);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (increases quantity)', () => {
    const { addItem } = useCartStore.getState();

    addItem(itemApple);
    addItem(itemApple);
    expect(useCartStore.getState().items).toEqual([
      { ...itemApple, quantity: 2 },
    ]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(itemApple);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...itemApple, quantity: 1 }]);
    }
  });
});
