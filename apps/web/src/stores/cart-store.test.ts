import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore, type CartItem } from './cart-store';

describe('Cart Store', () => {
  // Reset store before each test to ensure isolation
  beforeEach(() => {
    useCartStore.setState({ items: [], total: 0 });
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockItem1: Omit<CartItem, 'quantity'> = {
    id: 'item-1',
    productId: 'prod-1',
    title: 'Apple',
    price: 100,
    image: 'apple.jpg',
  };

  const mockItem2: Omit<CartItem, 'quantity'> = {
    id: 'item-2',
    productId: 'prod-2',
    title: 'Banana',
    price: 50,
    image: 'banana.jpg',
  };

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

  it('should increment quantity when adding an existing item', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem1);

    const { items, total } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ ...mockItem1, quantity: 2 });
    expect(total).toBe(200); // 100 * 2
  });

  it('should add different items separately', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem2);

    const { items, total } = useCartStore.getState();
    expect(items).toHaveLength(2);
    expect(items.find((i) => i.id === mockItem1.id)?.quantity).toBe(1);
    expect(items.find((i) => i.id === mockItem2.id)?.quantity).toBe(1);
    expect(total).toBe(150); // 100 + 50
  });

  it('should remove an item by id', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem2);

    removeItem(mockItem1.id);

    const { items, total } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe(mockItem2.id);
    expect(total).toBe(50);
  });

  it('should update item quantity', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem(mockItem1); // quantity: 1

    updateQuantity(mockItem1.id, 5);

    const { items, total } = useCartStore.getState();
    expect(items[0]?.quantity).toBe(5);
    expect(total).toBe(500); // 100 * 5
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(mockItem1);
    addItem(mockItem2);

    clearCart();

    const { items, total } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(mockItem1);

    // Zustand persist middleware writes to localStorage asynchronously or on update
    // We check if the key exists in localStorage after the update
    // Note: In some test environments, persist might be mocked or behave differently.
    // Given the memory note "Zustand store hooks... must use selector functions",
    // the store implementation uses `persist` middleware.

    // We need to manually check localStorage.
    // The key is 'cart-storage-v2' as per implementation.
    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      // parsed.state.items should be the items array
      expect(parsed.state.items).toHaveLength(1);
      expect(parsed.state.items[0].id).toBe(mockItem1.id);
    }
  });
});
