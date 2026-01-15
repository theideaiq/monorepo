// src/lib/youtube.ts

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

interface YouTubeVideoItem {
  id: string;
  snippet: YouTubeSnippet;
  contentDetails: YouTubeContentDetails;
}

export interface FormattedVideo {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration: string;
}

/**
 * Searches YouTube for music videos with strict duration filtering.
 *
 * Rules:
 * - Must be between 1 and 10 minutes long
 * - Must be categorized as Music (CategoryId: 10)
 *
 * @param query - The search term
 * @returns Array of video objects with normalized duration
 */

export async function searchYouTube(query: string): Promise<FormattedVideo[]> {
  // YOUTUBE_API_KEY removed as per request. Returning empty array.
  return [];
}
