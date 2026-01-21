import { describe, expect, it } from 'vitest';
import { WaylClient } from './client';

describe('WaylClient', () => {
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
});
