'use client';

import React, { useState, useEffect } from 'react';
// 1. Ensure you ran: npm install react-player
import ReactPlayer from 'react-player/youtube'; 
import { createClient } from '@/lib/supabase/client';
import { Play, SkipForward, Music } from 'lucide-react';

export default function JukeboxHost() {
  const [queue, setQueue] = useState<any[]>([]);
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const supabase = createClient();

  // 1. Initial Fetch & Subscribe to Realtime Updates
  useEffect(() => {
    fetchQueue();

    const channel = supabase
      .channel('jukebox_queue')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jukebox_queue' }, (payload) => {
        // Realtime: When a guest adds a song, add it to our local list immediately
        setQueue((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 2. Queue Manager Loop
  useEffect(() => {
    // If player is empty but queue has items, load the next one
    if (!currentVideo && queue.length > 0) {
      playNext();
    }
  }, [queue, currentVideo]);

  const fetchQueue = async () => {
    const { data } = await supabase
      .from('jukebox_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    
    if (data) setQueue(data);
  };

  const playNext = async () => {
    if (queue.length === 0) return;
    
    const next = queue[0];
    const remaining = queue.slice(1);
    
    setCurrentVideo(next);
    setQueue(remaining);

    // Database: Mark as played so it doesn't play again if we refresh the page
    await supabase.from('jukebox_queue').update({ status: 'played' }).eq('id', next.id);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      
      {/* PLAYER SECTION */}
      <div className="w-full max-w-4xl aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 mb-8 relative">
        <ReactPlayer
          // ⚠️ FIX: Use the standard YouTube URL format
          url={currentVideo ? `https://www.youtube.com/watch?v=${currentVideo.video_id}` : ''}
          playing={true}
          controls={true}
          width="100%"
          height="100%"
          onEnded={playNext} // Crucial: Auto-plays next video when current one ends
          onStart={() => setIsPlaying(true)}
        />
        
        {/* Empty State */}
        {!currentVideo && (
           <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
             <Music size={64} className="mb-4 opacity-50" />
             <p className="text-xl font-bold">Queue is empty</p>
             <p className="text-sm mt-2 opacity-70">Waiting for requests from guests...</p>
           </div>
        )}
      </div>

      {/* NOW PLAYING TEXT */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">
            {currentVideo?.title || "Silence in the Room"}
        </h1>
        <div className={`inline-flex items-center gap-2 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-widest ${isPlaying ? 'bg-red-600/20 text-red-500' : 'bg-gray-800 text-gray-500'}`}>
           {isPlaying ? "Now Playing" : "Standby"}
        </div>
      </div>

      {/* QUEUE LIST */}
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-2">
           <h3 className="text-gray-400 text-sm uppercase tracking-widest font-bold">Up Next ({queue.length})</h3>
           {currentVideo && (
             <button onClick={playNext} className="text-white hover:text-red-500 transition flex items-center gap-2 text-sm font-bold">
               <SkipForward size={16} /> Skip Song
             </button>
           )}
        </div>
        
        <div className="space-y-2">
          {queue.length === 0 ? (
             <p className="text-gray-700 text-center py-4 italic">No songs coming up.</p>
          ) : (
            queue.map((item, i) => (
                <div key={item.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="text-gray-500 font-mono text-sm w-6">#{i + 1}</span>
                <div className="relative w-12 h-8 rounded overflow-hidden flex-shrink-0">
                    <img src={item.thumbnail} className="object-cover w-full h-full" alt="thumb" />
                </div>
                <p className="truncate font-medium text-gray-300">{item.title}</p>
                </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

