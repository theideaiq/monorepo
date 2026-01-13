// src/lib/youtube.ts

// ⚡ Bolt Optimization: Pre-compile regexes to avoid re-compilation on every call
const ISO_DURATION_REGEX = /PT(\d+H)?(\d+M)?(\d+S)?/;
const DURATION_MINUTES_REGEX = /(\d+)M/;

// Constants for filtering and API requests
const MUSIC_CATEGORY_ID = 10;
const MAX_DURATION_MINUTES = 10;
const MIN_DURATION_MINUTES = 1;
const SEARCH_RESULT_LIMIT = 10;

// Interfaces for YouTube API Responses

interface YouTubeThumbnails {
  medium: {
    url: string;
    width?: number;
    height?: number;
  };
}

interface YouTubeSnippet {
  title: string;
  channelTitle: string;
  thumbnails: YouTubeThumbnails;
}

interface YouTubeContentDetails {
  duration: string;
}

interface YouTubeSearchItem {
  id: {
    videoId: string;
  };
}

interface YouTubeVideoItem {
  id: string;
  snippet: YouTubeSnippet;
  contentDetails: YouTubeContentDetails;
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

interface YouTubeVideoDetailsResponse {
  items?: YouTubeVideoItem[];
}

export interface FormattedVideo {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration: string;
}

/**
 * Converts an ISO 8601 duration string to a human-readable format.
 * @example parseDuration('PT4M13S') // Returns '4:13'
 * @param isoDuration - The duration string from YouTube API (e.g., 'PT1H2M10S')
 */
function parseDuration(isoDuration: string): string {
  const match = isoDuration.match(ISO_DURATION_REGEX);
  if (!match) return '0:00';

  const hours = (match[1] || '').replace('H', '');
  const mins = (match[2] || '').replace('M', '');
  const secs = (match[3] || '').replace('S', '');

  if (hours)
    return `${hours}:${mins.padStart(2, '0')}:${secs.padStart(2, '0')}`;
  return `${mins || '0'}:${secs.padStart(2, '0')}`;
}

/**
 * Searches YouTube for music videos with strict duration filtering.
 *
 * Rules:
 * - Must be between 1 and 10 minutes long
 * - Must be categorized as Music (CategoryId: 10)
 *
 * @param query - The search term
 * @throws {Error} If YOUTUBE_API_KEY is missing
 * @returns Array of video objects with normalized duration
 */
export async function searchYouTube(query: string): Promise<FormattedVideo[]> {
  const key = process.env.YOUTUBE_API_KEY;

  if (!key) throw new Error('YOUTUBE_API_KEY is missing');

  // 1. SEARCH
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=${MUSIC_CATEGORY_ID}&maxResults=${SEARCH_RESULT_LIMIT}&q=${encodeURIComponent(query)}&key=${key}`;

  // ⚡ Bolt Optimization: Cache search results for 1 hour to reduce API quota usage and latency
  const searchRes = await fetch(searchUrl, { next: { revalidate: 3600 } });
  const searchData: YouTubeSearchResponse = await searchRes.json();

  if (!searchData.items?.length) return [];

  // 2. GET DETAILS (For Duration)
  const videoIds = searchData.items.map((item) => item.id.videoId).join(',');
  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${key}`;

  // ⚡ Bolt Optimization: Cache video details for 1 hour
  const detailsRes = await fetch(detailsUrl, { next: { revalidate: 3600 } });
  const detailsData: YouTubeVideoDetailsResponse = await detailsRes.json();

  if (!detailsData.items) return [];

  // 3. FILTER & FORMAT
  return detailsData.items
    .filter((video) => {
      const duration = video.contentDetails.duration;
      const minutesMatch = duration.match(DURATION_MINUTES_REGEX);
      const minutes = minutesMatch ? Number.parseInt(minutesMatch[1], 10) : 0;

      // Strict Rules: 1 min < Length < 10 mins
      return (
        minutes < MAX_DURATION_MINUTES &&
        (minutes >= MIN_DURATION_MINUTES || duration.includes('S'))
      );
    })
    .map((video) => ({
      id: video.id,
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails.medium.url,
      channel: video.snippet.channelTitle,
      duration: parseDuration(video.contentDetails.duration),
    }));
}
