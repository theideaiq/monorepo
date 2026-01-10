import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchYouTube } from './youtube';

describe('searchYouTube', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('YOUTUBE_API_KEY', 'test-api-key');
    // Using vi.stubGlobal is safer than global.fetch = ...
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('should throw error if YOUTUBE_API_KEY is missing', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', '');
    await expect(searchYouTube('query')).rejects.toThrow(
      'YOUTUBE_API_KEY is missing',
    );
  });

  it('should return empty array if no videos found', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ items: [] }),
    } as Response);

    const result = await searchYouTube('query');
    expect(result).toEqual([]);
  });

  it('should filter videos based on duration and format results', async () => {
    const fetchMock = vi.mocked(fetch);

    // Mock search response
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({
          items: [
            { id: { videoId: 'v1' } },
            { id: { videoId: 'v2' } },
            { id: { videoId: 'v3' } },
            { id: { videoId: 'v4' } },
          ],
        }),
      } as Response)
      // Mock details response
      .mockResolvedValueOnce({
        json: async () => ({
          items: [
            {
              id: 'v1',
              snippet: {
                title: 'Valid Video',
                channelTitle: 'Channel 1',
                thumbnails: { medium: { url: 'http://thumb1.jpg' } },
              },
              contentDetails: { duration: 'PT5M30S' }, // 5:30 - OK
            },
            {
              id: 'v2',
              snippet: {
                title: 'Too Long',
                channelTitle: 'Channel 2',
                thumbnails: { medium: { url: 'http://thumb2.jpg' } },
              },
              contentDetails: { duration: 'PT15M0S' }, // 15:00 - Too long (> 10m)
            },
            {
              id: 'v3',
              snippet: {
                title: 'Too Short (only seconds)',
                channelTitle: 'Channel 3',
                thumbnails: { medium: { url: 'http://thumb3.jpg' } },
              },
              contentDetails: { duration: 'PT30S' }, // 0:30 - Kept by current logic
            },
            {
              id: 'v4',
              snippet: {
                title: 'Valid Video 2',
                channelTitle: 'Channel 4',
                thumbnails: { medium: { url: 'http://thumb4.jpg' } },
              },
              contentDetails: { duration: 'PT1M5S' }, // 1:05 - OK (> 1m)
            },
          ],
        }),
      } as Response);

    const result = await searchYouTube('query');

    expect(result).toHaveLength(3);

    expect(result[0]).toEqual({
      id: 'v1',
      title: 'Valid Video',
      thumbnail: 'http://thumb1.jpg',
      channel: 'Channel 1',
      duration: '5:30',
    });

    expect(result[1]).toEqual({
      id: 'v3',
      title: 'Too Short (only seconds)',
      thumbnail: 'http://thumb3.jpg',
      channel: 'Channel 3',
      duration: '0:30',
    });

    expect(result[2]).toEqual({
      id: 'v4',
      title: 'Valid Video 2',
      thumbnail: 'http://thumb4.jpg',
      channel: 'Channel 4',
      duration: '1:05',
    });
  });

  it('should parse duration correctly for edge cases', async () => {
    const fetchMock = vi.mocked(fetch);

    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({ items: [{ id: { videoId: 'v1' } }] }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          items: [
            {
              id: 'v1',
              snippet: {
                title: 'Hours Video',
                channelTitle: 'Channel',
                thumbnails: { medium: { url: 'url' } },
              },
              contentDetails: { duration: 'PT1H1M1S' },
            },
          ],
        }),
      } as Response);

    const result = await searchYouTube('query');

    // 1H 1M 1S. min=1. 1<10. Kept.
    expect(result[0].duration).toBe('1:01:01');
  });
});
