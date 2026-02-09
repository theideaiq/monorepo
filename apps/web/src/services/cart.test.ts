import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addToCartDB } from './cart';

// Mock Supabase client
const mockClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}));

describe('addToCartDB', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default: Authenticated user
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return false if user is not authenticated', async () => {
    mockClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const result = await addToCartDB('prod-1', 1);
    expect(result).toBe(false);
  });

  it('should return false if cart creation fails', async () => {
    // Mock carts query: find existing cart -> null
    const mockSelectCart = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    // Mock carts insert -> fail
    const mockInsertCart = {
      select: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Failed' } }),
    };

    mockClient.from.mockImplementation((table) => {
      if (table === 'carts') {
        return {
          select: vi.fn(() => mockSelectCart),
          insert: vi.fn(() => mockInsertCart),
        };
      }
      return {};
    });

    const result = await addToCartDB('prod-1', 1);
    expect(result).toBe(false);
  });

  it('should increment quantity if item already exists in cart', async () => {
    // Mock carts query: find existing cart -> 'cart-1'
    const mockSelectCart = {
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { id: 'cart-1' }, error: null }),
    };

    // Mock cart_items query: find existing item -> 'item-1'
    const mockSelectItem = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({
          data: { id: 'item-1', quantity: 2 },
          error: null,
        }),
    };

    // Mock cart_items update
    const mockUpdateItem = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    mockClient.from.mockImplementation((table) => {
      if (table === 'carts') {
        return { select: vi.fn(() => mockSelectCart) };
      }
      if (table === 'cart_items') {
        return {
          select: vi.fn(() => mockSelectItem),
          update: vi.fn(() => mockUpdateItem),
        };
      }
      return {};
    });

    const result = await addToCartDB('prod-1', 3);
    expect(result).toBe(true);

    expect(mockClient.from).toHaveBeenCalledWith('cart_items');
    expect(mockUpdateItem.eq).toHaveBeenCalled();
  });

  it('should insert new item if item does not exist in cart', async () => {
    // Mock carts query: find existing cart -> 'cart-1'
    const mockSelectCart = {
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { id: 'cart-1' }, error: null }),
    };

    // Mock cart_items query: find existing item -> null
    const mockSelectItem = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    // Mock cart_items insert
    const mockInsertItem = vi.fn().mockResolvedValue({ error: null });

    mockClient.from.mockImplementation((table) => {
      if (table === 'carts') {
        return { select: vi.fn(() => mockSelectCart) };
      }
      if (table === 'cart_items') {
        return {
          select: vi.fn(() => mockSelectItem),
          insert: mockInsertItem,
        };
      }
      return {};
    });

    const result = await addToCartDB('prod-1', 1);
    expect(result).toBe(true);
    expect(mockInsertItem).toHaveBeenCalledWith({
      cart_id: 'cart-1',
      product_id: 'prod-1',
      quantity: 1,
    });
  });

  it('should return false if database update fails', async () => {
    // Mock carts query: find existing cart -> 'cart-1'
    const mockSelectCart = {
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { id: 'cart-1' }, error: null }),
    };

    // Mock cart_items query: find existing item -> 'item-1'
    const mockSelectItem = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({
          data: { id: 'item-1', quantity: 1 },
          error: null,
        }),
    };

    // Mock cart_items update -> fail
    const mockUpdateItem = {
      eq: vi.fn().mockResolvedValue({ error: { message: 'DB Error' } }),
    };

    mockClient.from.mockImplementation((table) => {
      if (table === 'carts') {
        return { select: vi.fn(() => mockSelectCart) };
      }
      if (table === 'cart_items') {
        return {
          select: vi.fn(() => mockSelectItem),
          update: vi.fn(() => mockUpdateItem),
        };
      }
      return {};
    });

    const result = await addToCartDB('prod-1', 1);
    expect(result).toBe(false);
  });
});
