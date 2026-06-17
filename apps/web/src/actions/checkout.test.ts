import { describe, expect, it, vi, beforeEach } from 'vitest';
import { initiateCheckout } from './checkout';

const mocks = vi.hoisted(() => {
  return {
    getUser: vi.fn(),
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(),
    redirect: vi.fn(),
    getProvider: vi.fn(),
    createCheckoutSession: vi.fn(),
  };
});

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  }),
}));

// Mock Payment
vi.mock('@/lib/payment/config', () => ({
  paymentFactory: {
    getProvider: mocks.getProvider,
  },
}));

// Mock Env
vi.mock('@repo/env/web', () => ({
  webEnv: {
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  },
}));

// Mock Navigation
vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

// Mock Utils
vi.mock('@repo/utils', () => ({
  Logger: {
    error: vi.fn(),
  },
}));

describe('initiateCheckout', () => {
  const userId = 'user-123';
  const cartId = 'cart-abc';
  const otherUserId = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();

    // Default User
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId, email: 'test@example.com' } } });

    // Chain setup
    mocks.from.mockReturnValue({
      select: mocks.select,
      insert: mocks.insert,
    });
    mocks.select.mockReturnValue({
      eq: mocks.eq,
      single: mocks.single,
    });
    mocks.eq.mockReturnValue({
      single: mocks.single, // For cases where eq chains to single
    });

    // Default mocks return "this" for chaining if needed, but above covers most.
    // We need to handle specific table queries.
  });

  it('should throw Unauthorized when cart belongs to another user', async () => {
    // This test expects the security fix to be in place.
    // Currently, it will fail because the code does not check ownership.

    // 1. Mock `carts` query (The check we INTEND to add)
    // When fetching 'carts', return a cart belonging to `otherUserId`
    mocks.from.mockImplementation((table) => {
      if (table === 'carts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: cartId, user_id: otherUserId }, // Belongs to someone else
                error: null
              }),
            }),
          }),
        };
      }
      if (table === 'cart_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  quantity: 1,
                  products: { id: 'p1', name: 'Product 1', price: 100, description: 'desc' },
                },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'orders') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return { select: vi.fn() };
    });

    // Mock Payment Provider
    mocks.getProvider.mockReturnValue({
        name: 'test-provider',
        createCheckoutSession: mocks.createCheckoutSession,
    });
    mocks.createCheckoutSession.mockResolvedValue({
        sessionId: 'sess_123',
        url: 'http://checkout.url',
        provider: 'test-provider',
    });

    // Act & Assert
    // We expect it to throw "Unauthorized access to cart"
    await expect(initiateCheckout(cartId)).rejects.toThrow('Unauthorized access to cart');
  });
});
