
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { addToCartDB } from './cart';
import { createClient } from '@/lib/supabase/client';

// Mock the createClient function
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('addToCartDB', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Base mock structure
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return false if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await addToCartDB('prod-1', 1);

    expect(result).toBe(false);
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should add a new item to a new cart', async () => {
    // 1. Authenticated User
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    // Chain mocks
    const selectBuilder = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };
    const insertBuilder = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    // Setup `from` to return appropriate builders
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'carts') {
        return {
          select: vi.fn(() => selectBuilder),
          insert: vi.fn(() => insertBuilder),
        };
      }
      if (table === 'cart_items') {
        return {
          select: vi.fn(() => selectBuilder),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    // 2. Cart Lookup: Returns null (no cart)
    selectBuilder.single
      .mockResolvedValueOnce({ data: null }) // check cart existence
      .mockResolvedValueOnce({ data: null }); // check item existence (Wait, this is shared builder)

    // 3. Cart Creation: Returns new cart
    insertBuilder.single.mockResolvedValue({ data: { id: 'cart-new' }, error: null });

    const result = await addToCartDB('prod-1', 1);

    expect(result).toBe(true);

    // Verify Cart Creation
    expect(mockSupabase.from).toHaveBeenCalledWith('carts');
    expect(insertBuilder.single).toHaveBeenCalled();

    // Verify Item Insertion
    expect(mockSupabase.from).toHaveBeenCalledWith('cart_items');
    // We expect insert to be called with correct data
    // Note: checking specifically the object passed to insert on cart_items
    // But since `from` returns a dynamic object, capturing the specific call might be tricky without a spy.
    // However, the function returns !error, so if insert returns error:null, it works.
  });

  it('should update quantity if item exists', async () => {
    // 1. Authenticated User
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const selectBuilder = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };
    const updateBuilder = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'carts') {
        return {
          select: vi.fn(() => selectBuilder),
        };
      }
      if (table === 'cart_items') {
        return {
          select: vi.fn(() => selectBuilder),
          update: vi.fn(() => updateBuilder),
        };
      }
      return {};
    });

    // 2. Cart Lookup: Returns existing cart
    selectBuilder.single
      .mockResolvedValueOnce({ data: { id: 'cart-1' } }) // check cart existence
      .mockResolvedValueOnce({ data: { id: 'item-1', quantity: 2 } }); // check item existence

    const result = await addToCartDB('prod-1', 3);

    expect(result).toBe(true);

    // Verify Update
    expect(mockSupabase.from).toHaveBeenCalledWith('cart_items');
    // Verify update called with new quantity (2 + 3 = 5)
    // We can't easily check the argument to update() because it's on the builder returned by from().
    // But we can check that updateBuilder.eq was called (terminating the chain)
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'item-1');
  });
});
