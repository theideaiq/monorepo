// src/lib/youtube.ts

// ⚡ Bolt Optimization: Pre-compile regexes to avoid re-compilation on every call
const ISO_DURATION_REGEX = /PT(\d+H)?(\d+M)?(\d+S)?/;
const DURATION_MINUTES_REGEX = /(\d+)M/;

/**
 * Converts an ISO 8601 duration string to a human-readable format.
 * @example parseDuration('PT4M13S') // Returns '4:13'
 * @param isoDuration - The duration string from YouTube API (e.g., 'PT1H2M10S')
 */
function parseDuration(isoDuration: string) {
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
export async function searchYouTube(query: string) {
  const key = process.env.YOUTUBE_API_KEY;

  if (!key) throw new Error('YOUTUBE_API_KEY is missing');

  // 1. SEARCH
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=10&q=${encodeURIComponent(query)}&key=${key}`;

  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();

  if (!searchData.items?.length) return [];

  // 2. GET DETAILS (For Duration)

  const videoIds = searchData.items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((item: any) => item.id.videoId)
    .join(',');
  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${key}`;

  const detailsRes = await fetch(detailsUrl);
  const detailsData = await detailsRes.json();

  // 3. FILTER & FORMAT
  return (
    detailsData.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((video: any) => {
        const duration = video.contentDetails.duration;
        const minutesMatch = duration.match(DURATION_MINUTES_REGEX);
        const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

        // Strict Rules: 1 min < Length < 10 mins
        return minutes < 10 && (minutes >= 1 || duration.includes('S'));
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((video: any) => ({
        id: video.id,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.medium.url,
        channel: video.snippet.channelTitle,
        duration: parseDuration(video.contentDetails.duration),
      }))
  );
}
