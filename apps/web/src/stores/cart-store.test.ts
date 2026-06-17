import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore, type CartItem } from './cart-store';

// Helper to create a mock cart item
const createMockItem = (overrides: Partial<CartItem> = {}): Omit<CartItem, 'quantity'> => ({
  id: 'item-1',
  productId: 'prod-1',
  title: 'Test Product',
  price: 100,
  image: 'test.jpg',
  ...overrides,
});

describe('Cart Store', () => {
  // Reset store before each test to ensure isolation
  beforeEach(() => {
    useCartStore.setState({ items: [], total: 0 });
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should start with an empty cart', () => {
    const { items, total } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });

  it('should add a new item to the cart', () => {
    const { addItem } = useCartStore.getState();
    const newItem = createMockItem({ id: '1', title: 'Apple', price: 10 });

    addItem(newItem);

    const { items, total } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ ...newItem, quantity: 1 });
    expect(total).toBe(10);
  });

  it('should increment quantity when adding an existing item', () => {
    const { addItem } = useCartStore.getState();
    const item = createMockItem({ id: '1', title: 'Apple', price: 10 });

    addItem(item);
    addItem(item);

    const { items, total } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(total).toBe(20);
  });

  it('should remove an item from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();
    const item1 = createMockItem({ id: '1', title: 'Apple', price: 10 });
    const item2 = createMockItem({ id: '2', title: 'Banana', price: 20 });

    addItem(item1);
    addItem(item2);

    expect(useCartStore.getState().items).toHaveLength(2);

    removeItem('1');

    const { items, total } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('2');
    expect(total).toBe(20);
  });

  it('should update item quantity', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    const item = createMockItem({ id: '1', title: 'Apple', price: 10 });

    addItem(item);
    updateQuantity('1', 5);

    const { items, total } = useCartStore.getState();
    expect(items[0].quantity).toBe(5);
    expect(total).toBe(50);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();
    const item = createMockItem({ id: '1', title: 'Apple', price: 10 });

    addItem(item);
    clearCart();

    const { items, total } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });

  it('should calculate total correctly with multiple items', () => {
    const { addItem } = useCartStore.getState();

    addItem(createMockItem({ id: '1', price: 10 })); // qty 1 = 10
    addItem(createMockItem({ id: '2', price: 20 })); // qty 1 = 20
    addItem(createMockItem({ id: '1', price: 10 })); // qty 2 => 20 (total 10*2 + 20*1 = 40)

    const { total } = useCartStore.getState();
    expect(total).toBe(40);
  });
});
