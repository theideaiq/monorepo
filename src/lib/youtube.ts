// src/lib/youtube.ts

// Helper to parse ISO duration (PT4M13S -> 4:13)
function parseDuration(isoDuration: string) {
  const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return "0:00";

  const hours = (match[1] || '').replace('H', '');
  const mins = (match[2] || '').replace('M', '');
  const secs = (match[3] || '').replace('S', '');

  if (hours) return `${hours}:${mins.padStart(2, '0')}:${secs.padStart(2, '0')}`;
  return `${mins || '0'}:${secs.padStart(2, '0')}`;
}

export async function searchYouTube(query: string) {
  const key = process.env.YOUTUBE_API_KEY;

  if (!key) throw new Error("YOUTUBE_API_KEY is missing");

  // 1. SEARCH
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=10&q=${encodeURIComponent(query)}&key=${key}`;
  
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  
  if (!searchData.items?.length) return [];

  // 2. GET DETAILS (For Duration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${key}`;
  
  const detailsRes = await fetch(detailsUrl);
  const detailsData = await detailsRes.json();

  // 3. FILTER & FORMAT
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return detailsData.items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((video: any) => {
      const duration = video.contentDetails.duration;
      const minutesMatch = duration.match(/(\d+)M/);
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
      duration: parseDuration(video.contentDetails.duration)
    }));
}
