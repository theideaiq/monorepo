import { afterEach, describe, expect, it, vi } from 'vitest';
import { WaylClient } from './client';
import type { CreateLinkRequest } from './types';

describe('WaylClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should instantiate correctly', () => {
    const client = new WaylClient({ apiKey: 'test-key' });
    expect(client).toBeDefined();
    expect(client.links).toBeDefined();
    expect(client.products).toBeDefined();
    expect(client.subscriptions).toBeDefined();
  });

  it('should use default base URL', () => {
    const client = new WaylClient({ apiKey: 'test-key' });
    // access private property for testing if needed, or just trust the code
    expect(client).toHaveProperty('baseUrl', 'https://api.thewayl.com');
  });

  it('should allow custom base URL', () => {
    const client = new WaylClient({
      apiKey: 'test-key',
      baseUrl: 'http://localhost:3000',
    });
    expect(client).toHaveProperty('baseUrl', 'http://localhost:3000');
  });

  it('should throw error when api returns 400', async () => {
    const client = new WaylClient({ apiKey: 'test-key' });
    const mockErrorResponse = { message: 'Invalid payload' };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: async () => mockErrorResponse,
    } as Response);

    const data: CreateLinkRequest = {
      referenceId: 'ref-123',
      total: 100,
      currency: 'IQD',
    };

    await expect(client.links.create(data)).rejects.toThrow('Invalid payload');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.thewayl.com/api/v1/links',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WAYL-AUTHENTICATION': 'test-key',
        },
        body: JSON.stringify(data),
      }),
    );
  });
});
