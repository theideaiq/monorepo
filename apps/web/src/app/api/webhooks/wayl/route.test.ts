import { Logger } from '@repo/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

vi.mock('@repo/utils', () => ({
  Logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Wayl Webhook Route', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should process Complete status and return received: true', async () => {
    const req = new Request('http://localhost/api/webhooks/wayl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'Complete',
        referenceId: 'order-123',
        paymentMethod: 'credit_card',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ received: true });
    expect(Logger.log).toHaveBeenCalledWith(
      'Wayl Webhook Received:',
      expect.any(Object),
    );
    expect(Logger.log).toHaveBeenCalledWith(
      'Payment Complete for Order order-123 via credit_card',
    );
  });

  it('should process Cancelled status and log a warning', async () => {
    const req = new Request('http://localhost/api/webhooks/wayl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'Cancelled',
        referenceId: 'order-123',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ received: true });
    expect(Logger.warn).toHaveBeenCalledWith(
      'Payment Failed/Cancelled for Order order-123',
    );
  });

  it('should handle invalid JSON and return 500', async () => {
    const req = new Request('http://localhost/api/webhooks/wayl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: 'Webhook processing failed' });
    expect(Logger.error).toHaveBeenCalledWith(
      'Wayl Webhook Error:',
      expect.any(Error),
    );
  });

  it('should log a warning if signature is missing in production', async () => {
    process.env.NODE_ENV = 'production';

    const req = new Request('http://localhost/api/webhooks/wayl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Complete', referenceId: 'order-123' }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(Logger.warn).toHaveBeenCalledWith('Missing Wayl Signature');
  });
});
