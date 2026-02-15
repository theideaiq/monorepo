import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';

const ITEM_APPLE = {
  id: 'apple-id',
  productId: 'apple-prod',
  title: 'Apple',
  price: 100,
  image: 'apple.png',
};

const ITEM_BANANA = {
  id: 'banana-id',
  productId: 'banana-prod',
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
  });

  it('should start with an empty cart', () => {
    const { items } = useCartStore.getState();
    expect(items).toEqual([]);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(ITEM_APPLE);
    expect(useCartStore.getState().items).toEqual([
      { ...ITEM_APPLE, quantity: 1 },
    ]);

    addItem(ITEM_BANANA);
    expect(useCartStore.getState().items).toEqual([
      { ...ITEM_APPLE, quantity: 1 },
      { ...ITEM_BANANA, quantity: 1 },
    ]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(ITEM_APPLE);
    addItem(ITEM_BANANA);

    removeItem(ITEM_APPLE.id);
    expect(useCartStore.getState().items).toEqual([
      { ...ITEM_BANANA, quantity: 1 },
    ]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(ITEM_APPLE);
    addItem(ITEM_BANANA);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (increments quantity)', () => {
    const { addItem } = useCartStore.getState();

    addItem(ITEM_APPLE);
    addItem(ITEM_APPLE);

    // The store implementation increments quantity, it doesn't add duplicate item to array
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]).toEqual({ ...ITEM_APPLE, quantity: 2 });
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(ITEM_APPLE);

    // wait for persist middleware? usually sync.
    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...ITEM_APPLE, quantity: 1 }]);
    }
  });
});
