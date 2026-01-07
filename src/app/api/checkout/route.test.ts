import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { wayl } from '@/lib/wayl';

// Mock the wayl library
vi.mock('@/lib/wayl', () => ({
  wayl: {
    createPayment: vi.fn(),
  },
}));

describe('POST /api/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if amount is missing or invalid', async () => {
    const invalidAmounts = [null, undefined, 0, -10, '100'];

    for (const amount of invalidAmounts) {
      const req = new Request('http://localhost/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          amount,
          planName: 'Test Plan',
          userEmail: 'test@example.com',
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid amount');
    }
  });

  it('should return 400 if planName is missing or invalid', async () => {
    const invalidPlans = [null, undefined, '', '   '];

    for (const planName of invalidPlans) {
      const req = new Request('http://localhost/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          amount: 100,
          planName,
          userEmail: 'test@example.com',
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid planName');
    }
  });

  it('should return 400 if userEmail is missing or invalid', async () => {
    const invalidEmails = [
      null,
      undefined,
      '',
      'not-an-email',
      'test@',
      '@test.com',
    ];

    for (const userEmail of invalidEmails) {
      const req = new Request('http://localhost/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          amount: 100,
          planName: 'Test Plan',
          userEmail,
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid userEmail');
    }
  });

  it('should return 200 and payment URL on valid input', async () => {
    const mockUrl = 'https://checkout.wayl.com/pay/123';
    vi.mocked(wayl.createPayment).mockResolvedValue(mockUrl);

    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      body: JSON.stringify({
        amount: 100,
        planName: 'Premium',
        userEmail: 'user@example.com',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe(mockUrl);

    expect(wayl.createPayment).toHaveBeenCalledWith(
      100,
      'IQD',
      'Subscription: Premium for user@example.com',
    );
  });

  it('should return 500 if wayl.createPayment fails', async () => {
    vi.mocked(wayl.createPayment).mockRejectedValue(
      new Error('Wayl API Error'),
    );

    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      body: JSON.stringify({
        amount: 100,
        planName: 'Premium',
        userEmail: 'user@example.com',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Wayl API Error');
  });
});
