import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchYouTube } from '@/lib/youtube';
import { GET } from './route';

// Mock the youtube library
vi.mock('@/lib/youtube', () => ({
  searchYouTube: vi.fn(),
}));

describe('YouTube Search API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty items array if q parameter is missing', async () => {
    const req = new Request('http://localhost/api/youtube/search');

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ items: [] });
    expect(searchYouTube).not.toHaveBeenCalled();
  });

  it('should return empty items array if q parameter is empty', async () => {
    const req = new Request('http://localhost/api/youtube/search?q=');

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ items: [] });
    expect(searchYouTube).not.toHaveBeenCalled();
  });

  it('should call searchYouTube and return items on success', async () => {
    const mockItems = [
      {
        id: 'v1',
        title: 'Test Video 1',
        thumbnail: 'thumb1.jpg',
        channel: 'Channel 1',
        duration: '3:00',
      },
      {
        id: 'v2',
        title: 'Test Video 2',
        thumbnail: 'thumb2.jpg',
        channel: 'Channel 2',
        duration: '4:00',
      },
    ];
    vi.mocked(searchYouTube).mockResolvedValue(mockItems);

    const req = new Request('http://localhost/api/youtube/search?q=test');

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ items: mockItems });
    expect(searchYouTube).toHaveBeenCalledWith('test');
  });

  it('should return 500 when searchYouTube throws', async () => {
    vi.mocked(searchYouTube).mockRejectedValue(
      new Error('YouTube API quota exceeded'),
    );

    const req = new Request('http://localhost/api/youtube/search?q=test');

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: 'Failed to fetch music' });
  });
});
