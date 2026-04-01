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

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    const apple = { id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: 'a.png' };
    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 1 }]);

    const banana = { id: 'banana', productId: 'p2', title: 'Banana', price: 15, image: 'b.png' };
    addItem(banana);
    expect(useCartStore.getState().items).toEqual([
      { ...apple, quantity: 1 },
      { ...banana, quantity: 1 },
    ]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    const apple = { id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: 'a.png' };
    const banana = { id: 'banana', productId: 'p2', title: 'Banana', price: 15, image: 'b.png' };

    addItem(apple);
    addItem(banana);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([{ ...banana, quantity: 1 }]);
  });

  it('should update the quantity of an item', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem({
      id: 'apple',
      productId: 'p-apple',
      title: 'Apple',
      price: 10,
      image: 'apple.png',
    });

    // Update quantity to 3
    updateQuantity('apple', 3);
    expect(useCartStore.getState().items).toEqual([
      {
        id: 'apple',
        productId: 'p-apple',
        title: 'Apple',
        price: 10,
        image: 'apple.png',
        quantity: 3,
      },
    ]);
    expect(useCartStore.getState().total).toBe(30);

    // Update quantity to less than 1 (should not update)
    updateQuantity('apple', 0);
    expect(useCartStore.getState().items).toEqual([
      {
        id: 'apple',
        productId: 'p-apple',
        title: 'Apple',
        price: 10,
        image: 'apple.png',
        quantity: 3,
      },
    ]);
    expect(useCartStore.getState().total).toBe(30);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem({
      id: 'apple',
      productId: 'p-apple',
      title: 'Apple',
      price: 10,
      image: 'apple.png',
    });
    addItem({
      id: 'banana',
      productId: 'p-banana',
      title: 'Banana',
      price: 15,
      image: 'banana.png',
    });

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (removes all instances)', () => {
    // Current behavior documentation: adding an existing item increases its quantity
    const { addItem, removeItem } = useCartStore.getState();

    const apple = { id: 'apple', productId: 'p1', title: 'Apple', price: 10, image: 'a.png' };
    addItem(apple);
    addItem(apple);

    // It should just increase the quantity to 2, not duplicate the item array entry
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 2 }]);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();

    const persistentItem = { id: 'persistent-item', productId: 'p1', title: 'Persist', price: 10, image: 'p.png' };
    addItem(persistentItem);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...persistentItem, quantity: 1 }]);
    }
  });
});
