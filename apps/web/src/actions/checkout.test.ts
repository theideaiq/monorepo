
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initiateCheckout } from './checkout';
import { redirect } from 'next/navigation';

const mocks = vi.hoisted(() => {
  return {
    getUser: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    from: vi.fn(),
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

// Mock Utils
vi.mock('@repo/utils', () => ({
  Logger: {
    error: vi.fn(),
  },
}));

// Mock Next Navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('initiateCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.from.mockImplementation((table) => {
        if (table === 'cart_items') {
            return {
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                        data: [
                            {
                                quantity: 1,
                                products: {
                                    id: 'p1',
                                    name: 'Test Product',
                                    price: 1000,
                                    description: 'Desc'
                                }
                            }
                        ],
                        error: null
                    })
                })
            };
        }
        if (table === 'carts') {
             return {
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: mocks.single
                    })
                })
            };
        }
        if (table === 'orders') {
            return {
                insert: vi.fn().mockResolvedValue({ error: null })
            };
        }
        return {};
    });

    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'test@example.com' } } });
    mocks.getProvider.mockReturnValue({
        name: 'test-provider',
        createCheckoutSession: mocks.createCheckoutSession
    });
    mocks.createCheckoutSession.mockResolvedValue({
        sessionId: 'sess_123',
        url: 'http://payment.url',
        provider: 'test-provider',
        metadata: {}
    });
});

  it('should redirect to payment URL on success', async () => {
    // We expect the security check to pass (mocked return for current user)
    mocks.single.mockResolvedValue({
        data: { user_id: 'user-123' },
        error: null
    });

    await initiateCheckout('cart-123');

    expect(mocks.createCheckoutSession).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('http://payment.url');
  });

  it('should throw Unauthorized if cart belongs to another user', async () => {
    // Setup the mock for 'carts' to return a different user_id
    mocks.single.mockResolvedValue({
        data: { user_id: 'other-user' },
        error: null
    });

    // We expect it to FAIL securely.
    await expect(initiateCheckout('cart-123')).rejects.toThrow('Unauthorized');
  });
});
