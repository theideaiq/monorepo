'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { SkipForward, Disc3, Play, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ReactPlayer = dynamic(() => import('react-player'), { 
  ssr: false,
}) as any;

export default function JukeboxHost() {
  const [queue, setQueue] = useState<any[]>([]);
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const supabase = createClient();

  // 1. Setup Realtime
  useEffect(() => {
    const fetchQueue = async () => {
      const { data } = await supabase
        .from('jukebox_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (data) setQueue(data);
    };

    fetchQueue();

    const channel = supabase
      .channel('jukebox_queue')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jukebox_queue' }, (payload) => {
        setQueue((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 2. Autoplay Logic
  useEffect(() => {
    if (!currentVideo && queue.length > 0) {
      playNext();
    }
  }, [queue, currentVideo]);

  const playNext = async () => {
    if (queue.length === 0) {
      setCurrentVideo(null);
      setIsPlaying(false);
      return;
    }
    const next = queue[0];
    const remaining = queue.slice(1);
    setCurrentVideo(next);
    setQueue(remaining);
    await supabase.from('jukebox_queue').update({ status: 'played' }).eq('id', next.id);
  };

  // 3. START SCREEN (Critical for Audio Permissions)
  if (!hasInteracted) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4 text-center">
        <button 
          onClick={() => setHasInteracted(true)}
          className="bg-red-600 hover:bg-red-700 text-white rounded-full p-8 shadow-[0_0_50px_rgba(220,38,38,0.5)] transition transform hover:scale-110 mb-6 group"
        >
          <Play size={48} fill="currentColor" className="ml-2 group-hover:scale-110 transition" />
        </button>
        <h1 className="text-2xl font-black uppercase tracking-tighter mb-2">IDEA Jukebox</h1>
        <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">Tap to Connect Speakers</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-hidden font-sans relative flex flex-col">
      
      {/* BACKGROUND GLOW */}
      {currentVideo && (
        <div className="absolute inset-0 z-0">
          <Image 
            src={currentVideo.thumbnail} 
            alt="bg" 
            fill 
            className="object-cover opacity-20 blur-3xl scale-125 animate-pulse" 
            style={{ animationDuration: '4s' }}
          />
        </div>
      )}

      {/* --- THE "HIDDEN" PLAYER (The Fix) --- */}
      {/* We make it 1px x 1px so the browser thinks it's visible and allows audio */}
      <div className="absolute opacity-0 pointer-events-none" style={{ width: '1px', height: '1px', overflow: 'hidden' }}>
        <ReactPlayer
          key={currentVideo?.video_id || 'empty'}
          // ✅ FIX: Standard YouTube URL
          url={currentVideo ? `https://www.youtube.com/watch?v=${currentVideo.video_id}` : ''}
          playing={true}
          muted={false}       // Audio ON
          volume={1}          // Max Volume
          playsinline={true}  // iOS Requirement
          width="100%"
          height="100%"
          onEnded={playNext}
          onStart={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={(e: any) => console.error("Player Error:", e)}
        />
      </div>

      {/* --- MAIN STAGE (Vinyl) --- */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 p-8">
        
        {/* The Vinyl Record */}
        <motion.div 
          animate={{ rotate: isPlaying ? 360 : 0 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="relative w-64 h-64 md:w-96 md:h-96 rounded-full shadow-[0_0_60px_rgba(0,0,0,0.8)] border-4 border-gray-900 bg-black flex items-center justify-center overflow-hidden"
        >
          {/* Vinyl Texture */}
          <div className="absolute inset-0 rounded-full border-[2px] border-white/5"></div>
          <div className="absolute inset-0 rounded-full border-[20px] border-neutral-900/80 pointer-events-none"></div>
          <div className="absolute inset-0 rounded-full border-[50px] border-neutral-800/50 pointer-events-none"></div>
          
          {/* Album Art (Center Label) */}
          <div className="relative w-[45%] h-[45%] rounded-full overflow-hidden border-4 border-neutral-950 shadow-2xl">
            {currentVideo ? (
               <Image src={currentVideo.thumbnail} alt="art" fill className="object-cover" />
            ) : (
               <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                 <Disc3 className="text-neutral-700" size={48} />
               </div>
            )}
          </div>
        </motion.div>

        {/* Now Playing Text */}
        <div className="mt-16 text-center space-y-4 max-w-2xl z-20">
          <div className="flex items-center justify-center gap-2 text-red-500 font-bold uppercase tracking-[0.2em] text-xs">
             {isPlaying ? <Volume2 size={16} className="animate-pulse" /> : <Disc3 size={16} />}
             {isPlaying ? "On Air" : "Waiting for Queue"}
          </div>
          <h1 className="text-3xl md:text-6xl font-black tracking-tighter leading-none drop-shadow-2xl">
            {currentVideo?.title || "IDEA Jukebox"}
          </h1>
        </div>
      </div>

      {/* --- UP NEXT QUEUE --- */}
      <div className="bg-black/60 backdrop-blur-xl border-t border-white/5 p-6 h-auto min-h-[180px] relative z-20">
         <div className="max-w-6xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Up Next ({queue.length})</h3>
              {currentVideo && (
                <button 
                  onClick={playNext} 
                  className="flex items-center gap-2 text-xs font-bold bg-white/10 hover:bg-red-600 hover:text-white px-4 py-2 rounded-full transition-colors"
                >
                  <SkipForward size={14} /> Skip Track
                </button>
              )}
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {queue.length === 0 ? (
                <div className="flex items-center justify-center w-full h-24 text-gray-600 text-sm font-medium italic border border-dashed border-white/10 rounded-xl">
                  Add songs from your phone to start the party...
                </div>
              ) : (
                queue.map((item, i) => (
                  <div key={item.id} className="min-w-[160px] max-w-[160px] p-2 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition group">
                    <div className="relative aspect-video rounded-lg overflow-hidden mb-3 bg-neutral-800">
                       <Image 
                         src={item.thumbnail} 
                         alt="thumb" 
                         fill 
                         className="object-cover group-hover:scale-105 transition duration-500" 
                         sizes="160px"
                       />
                    </div>
                    <p className="text-xs font-bold truncate text-gray-200 mb-1">{item.title}</p>
                    <p className="text-[10px] text-gray-500 font-mono uppercase">#{i + 1} Queue</p>
                  </div>
                ))
              )}
            </div>
         </div>
      </div>

    </div>
  );
}
