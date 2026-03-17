import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initiateCheckout } from './checkout';
import { redirect } from 'next/navigation';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

const mocks = vi.hoisted(() => {
  return {
    getUser: vi.fn(),
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    createCheckoutSession: vi.fn(),
    getProvider: vi.fn(),
  };
});

mocks.from.mockReturnValue({ select: mocks.select, insert: mocks.insert });
mocks.select.mockReturnValue({ eq: mocks.eq });

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  }),
}));

vi.mock('@/lib/payment/config', () => ({
  paymentFactory: {
    getProvider: mocks.getProvider,
  },
}));

vi.mock('@repo/env/web', () => ({
  webEnv: {
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  },
}));

// Mock crypto
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => '12345678-1234-1234-1234-123456789012'
  }
});

describe('initiateCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'test@example.com' } } });
    mocks.eq.mockResolvedValue({
      data: [{ quantity: 2, products: { id: 'prod-1', name: 'Product 1', price: 1000, description: 'Desc' } }],
      error: null
    });
    mocks.getProvider.mockReturnValue({
      name: 'wayl',
      createCheckoutSession: mocks.createCheckoutSession.mockResolvedValue({
        sessionId: 'session-123',
        provider: 'wayl',
        metadata: {},
        url: 'https://checkout.wayl.com/session-123'
      })
    });
    mocks.insert.mockResolvedValue({ error: null });
  });

  it('should redirect to checkout URL on successful checkout initiation', async () => {
    await initiateCheckout('cart-123');

    expect(mocks.getUser).toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledWith('cart_items');
    expect(mocks.eq).toHaveBeenCalledWith('cart_id', 'cart-123');
    expect(mocks.createCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({
      amount: 2000,
      currency: 'IQD',
      customer: { email: 'test@example.com' },
    }));
    expect(mocks.from).toHaveBeenCalledWith('orders');
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-123',
      total_amount: 2000,
      status: 'pending',
      gateway_link_id: 'session-123',
      gateway_provider: 'wayl',
    }));
    expect(redirect).toHaveBeenCalledWith('https://checkout.wayl.com/session-123');
  });

  it('should throw an error if the user is not authenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(initiateCheckout('cart-123')).rejects.toThrow('User not authenticated');
  });

  it('should throw an error if the cart is empty or not found', async () => {
    mocks.eq.mockResolvedValue({ data: [], error: null });
    await expect(initiateCheckout('cart-123')).rejects.toThrow('Cart is empty or not found');
  });

  it('should throw an error if order creation fails', async () => {
    mocks.insert.mockResolvedValue({ error: new Error('DB Error') });
    await expect(initiateCheckout('cart-123')).rejects.toThrow('Failed to create order');
  });
});
