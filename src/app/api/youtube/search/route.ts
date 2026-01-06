import { NextResponse } from 'next/server';
import { searchYouTube } from '@/lib/youtube'; // Import from your new lib

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) return NextResponse.json({ items: [] });

  try {
    // Call the library function
    const items = await searchYouTube(q);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('YouTube Search Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch music' },
      { status: 500 },
    );
  }
}
