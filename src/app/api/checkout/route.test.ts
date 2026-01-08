import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { wayl } from '@/lib/wayl';

// Mock the wayl library
vi.mock('@/lib/wayl', () => ({
  wayl: {
    createPayment: vi.fn(),
  },
}));

describe('Checkout API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    const invalidCases = [
      {
        name: 'invalid amount (negative)',
        body: { amount: -5, planName: 'Test', userEmail: 'test@example.com' },
        errorMatch: /Invalid amount/
      },
      {
        name: 'invalid amount (zero)',
        body: { amount: 0, planName: 'Test', userEmail: 'test@example.com' },
        errorMatch: /Invalid amount/
      },
      {
        name: 'invalid amount (not a number)',
        body: { amount: 'ten', planName: 'Test', userEmail: 'test@example.com' },
        errorMatch: /Invalid amount/
      },
      {
        name: 'missing planName',
        body: { amount: 100, planName: '', userEmail: 'test@example.com' },
        errorMatch: /Invalid planName/
      },
      {
        name: 'invalid planName (not a string)',
        body: { amount: 100, planName: 123, userEmail: 'test@example.com' },
        errorMatch: /Invalid planName/
      },
      {
        name: 'invalid userEmail (format)',
        body: { amount: 100, planName: 'Pro', userEmail: 'invalid-email' },
        errorMatch: /Invalid userEmail/
      },
      {
        name: 'invalid userEmail (missing)',
        body: { amount: 100, planName: 'Pro', userEmail: '' },
        errorMatch: /Invalid userEmail/
      },
    ];

    it.each(invalidCases)('should return 400 when $name', async ({ body, errorMatch }) => {
      const req = new Request('http://localhost/api/checkout', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toMatch(errorMatch);
    });
  });

  it('should call wayl.createPayment and return URL on success', async () => {
    const mockUrl = 'https://checkout.wayl.com/pay/123';
    vi.mocked(wayl.createPayment).mockResolvedValue(mockUrl);

    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ amount: 1000, planName: 'Premium', userEmail: 'user@example.com' }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toBe(mockUrl);
    expect(wayl.createPayment).toHaveBeenCalledWith(
      1000,
      'IQD',
      'Subscription: Premium for user@example.com'
    );
  });

  it('should return 500 when wayl service fails', async () => {
    vi.mocked(wayl.createPayment).mockRejectedValue(new Error('Wayl service down'));

    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ amount: 1000, planName: 'Premium', userEmail: 'user@example.com' }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Wayl service down');
  });
});
