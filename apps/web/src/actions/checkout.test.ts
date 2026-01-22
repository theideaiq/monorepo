import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initiateCheckout } from './checkout';

const mocks = vi.hoisted(() => {
  return {
    getUser: vi.fn(),
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(),
    paymentFactory: {
      getProvider: vi.fn(),
    },
    createCheckoutSession: vi.fn(),
  };
});

// Setup mock return values/chaining
mocks.from.mockReturnValue({ select: mocks.select, insert: mocks.insert });
mocks.select.mockReturnValue({ eq: mocks.eq });
mocks.eq.mockReturnValue({ single: mocks.single }); // For the new check
// Note: The original code uses .eq().something else for cart_items?
// Original: .from('cart_items').select(...).eq(...) returns { data, error } directly (awaitable)
// But for my NEW check: .from('carts').select(...).eq(...).single() returns { data, error }

// To handle multiple .from() calls returning different chains, we might need a more sophisticated mock
// or just ensure the chain works for both.
// Chain 1 (Cart Items): from -> select -> eq -> resolve { data: items }
// Chain 2 (New Owner Check): from -> select -> eq -> single -> resolve { data: cart }
// Chain 3 (Order): from -> insert -> resolve { error }

// Let's make the chain flexible.
const queryBuilder = {
  select: mocks.select,
  insert: mocks.insert,
};
const selectBuilder = {
  eq: mocks.eq,
};
const eqBuilder = {
  single: mocks.single,
  // biome-ignore lint/suspicious/noThenProperty: Mocking a Thenable for Supabase query builder
  // biome-ignore lint/suspicious/noExplicitAny: Resolving with any structure
  then: (resolve: (value: any) => void) => resolve({ data: [], error: null }), // Default for await
};

mocks.from.mockReturnValue(queryBuilder);
mocks.select.mockReturnValue(selectBuilder);
mocks.eq.mockReturnValue(eqBuilder);
mocks.single.mockResolvedValue({ data: null, error: null });
mocks.insert.mockResolvedValue({ error: null });

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  }),
}));

vi.mock('@repo/env/web', () => ({
  webEnv: {
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    WAYL_SECRET_KEY: 'mock-key',
    WAYL_WEBHOOK_SECRET: 'mock-secret',
  },
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/lib/payment/config', () => ({
  paymentFactory: mocks.paymentFactory,
}));

vi.mock('@repo/utils', () => ({
  Logger: {
    error: vi.fn(),
  },
}));

describe('initiateCheckout', () => {
  const userId = 'user-uuid-1234';
  const cartId = '00000000-0000-0000-0000-000000000000'; // Valid UUID

  beforeEach(() => {
    vi.clearAllMocks();

    // Default Authenticated User
    mocks.getUser.mockResolvedValue({
      data: { user: { id: userId, email: 'test@example.com' } },
    });

    // Default Payment Provider
    mocks.createCheckoutSession.mockResolvedValue({
      sessionId: 'sess_123',
      url: 'https://payment.url',
      provider: 'wayl',
      metadata: {},
    });
    mocks.paymentFactory.getProvider.mockReturnValue({
      createCheckoutSession: mocks.createCheckoutSession,
      name: 'wayl',
    });
  });

  it('should throw error if user is not authenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(initiateCheckout(cartId)).rejects.toThrow(
      'User not authenticated',
    );
  });

  it('should throw error if cartId is not a valid UUID', async () => {
    // This expects the NEW validation logic
    await expect(initiateCheckout('invalid-uuid')).rejects.toThrow(
      'Invalid cart ID',
    );
  });

  it('should throw error if cart does not belong to user', async () => {
    // Setup for Ownership Check
    // When checking 'carts', return a cart with different user_id
    mocks.from.mockImplementation((table: string) => {
      if (table === 'carts') {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({
                data: { user_id: 'other-user' },
                error: null,
              }),
            }),
          }),
        };
      }
      return queryBuilder; // Fallback for other tables
    });

    await expect(initiateCheckout(cartId)).rejects.toThrow(
      'Unauthorized access to cart',
    );
  });

  it('should proceed if cart belongs to user', async () => {
    // 1. Ownership Check: Success
    mocks.from.mockImplementation((table: string) => {
      if (table === 'carts') {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({
                data: { user_id: userId },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'cart_items') {
        return {
          select: () => ({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  quantity: 1,
                  products: {
                    id: 'prod_1',
                    name: 'Test Product',
                    price: 100,
                    description: 'Desc',
                  },
                },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'orders') {
        return {
          insert: mocks.insert,
        };
      }
      return queryBuilder;
    });

    await initiateCheckout(cartId);

    expect(redirect).toHaveBeenCalledWith('https://payment.url');
  });
});
