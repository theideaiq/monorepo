// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { searchYouTube } from './youtube';

describe('searchYouTube', () => {
  it('should return empty array (functionality disabled)', async () => {
    const result = await searchYouTube('query');
    expect(result).toEqual([]);
  });
});
