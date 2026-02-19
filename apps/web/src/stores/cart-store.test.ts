import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';

const MOCK_ITEM_1 = {
  id: 'item-1',
  productId: 'prod-1',
  title: 'Apple',
  price: 100,
  image: 'apple.png',
  quantity: 0, // Initial quantity for adding
};

const MOCK_ITEM_2 = {
  id: 'item-2',
  productId: 'prod-2',
  title: 'Banana',
  price: 50,
  image: 'banana.png',
  quantity: 0,
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
    const { items } = useCartStore.getState();
    expect(items).toEqual([]);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    // addItem expects Omit<CartItem, 'quantity'>, so we don't pass quantity
    const item1 = { ...MOCK_ITEM_1 };
    // @ts-ignore
    delete item1.quantity;

    addItem(item1);
    expect(useCartStore.getState().items).toEqual([
      { ...MOCK_ITEM_1, quantity: 1 },
    ]);

    const item2 = { ...MOCK_ITEM_2 };
    // @ts-ignore
    delete item2.quantity;

    addItem(item2);
    expect(useCartStore.getState().items).toEqual([
      { ...MOCK_ITEM_1, quantity: 1 },
      { ...MOCK_ITEM_2, quantity: 1 },
    ]);
  });

  it('should increment quantity for duplicate items', () => {
    const { addItem } = useCartStore.getState();
    const item1 = { ...MOCK_ITEM_1 };
    // @ts-ignore
    delete item1.quantity;

    addItem(item1);
    addItem(item1);

    expect(useCartStore.getState().items).toEqual([
      { ...MOCK_ITEM_1, quantity: 2 },
    ]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();
    const item1 = { ...MOCK_ITEM_1 };
    // @ts-ignore
    delete item1.quantity;
    const item2 = { ...MOCK_ITEM_2 };
    // @ts-ignore
    delete item2.quantity;

    addItem(item1);
    addItem(item2);

    removeItem(MOCK_ITEM_1.id);
    expect(useCartStore.getState().items).toEqual([
      { ...MOCK_ITEM_2, quantity: 1 },
    ]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();
    const item1 = { ...MOCK_ITEM_1 };
    // @ts-ignore
    delete item1.quantity;

    addItem(item1);
    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const item1 = { ...MOCK_ITEM_1 };
    // @ts-ignore
    delete item1.quantity;

    addItem(item1);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...MOCK_ITEM_1, quantity: 1 }]);
    }
  });
});
