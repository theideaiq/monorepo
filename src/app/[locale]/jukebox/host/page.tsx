'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { SkipForward, Play, Volume2, VolumeX, Radio, Disc3, Mic2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamic Import to avoid hydration errors
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

export default function JukeboxHost() {
  const [queue, setQueue] = useState<any[]>([]);
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false); // Controls the "Start" screen
  const [volume, setVolume] = useState(1);       // Max volume
  
  const supabase = createClient();

  // 1. Setup Realtime Listener
  useEffect(() => {
    fetchQueue();

    const channel = supabase
      .channel('jukebox_queue')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jukebox_queue' }, (payload) => {
        setQueue((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 2. Queue Manager Loop
  useEffect(() => {
    // Only auto-play if the user has clicked "Start"
    if (isReady && !currentVideo && queue.length > 0) {
      playNext();
    }
  }, [queue, currentVideo, isReady]);

  const fetchQueue = async () => {
    const { data } = await supabase
      .from('jukebox_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    
    if (data) setQueue(data);
  };

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

    // Update DB status
    await supabase.from('jukebox_queue').update({ status: 'played' }).eq('id', next.id);
  };

  // --- 3. THE "START" SCREEN (Mandatory for Audio) ---
  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white relative overflow-hidden">
        {/* Abstract Brand Background */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-pink/20 blur-[100px] rounded-full animate-pulse"></div>

        <div className="relative z-10 text-center space-y-8">
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }} 
             animate={{ scale: 1, opacity: 1 }}
             className="w-32 h-32 bg-gradient-to-br from-brand-pink to-brand-yellow rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(233,30,99,0.5)] cursor-pointer hover:scale-105 transition-transform"
             onClick={() => setIsReady(true)}
           >
              <Play size={48} fill="white" className="ml-2" />
           </motion.div>
           
           <div>
             <h1 className="text-4xl font-black tracking-tighter mb-2">IDEA JUKEBOX</h1>
             <p className="text-slate-400 font-mono text-sm uppercase tracking-widest">Tap to Initialize Audio Engine</p>
           </div>
        </div>
      </div>
    );
  }

  // --- 4. THE MAIN INTERFACE ---
  return (
    <div className="relative min-h-screen w-full bg-black overflow-hidden font-sans text-white flex flex-col md:flex-row">
      
      {/* === LAYER 1: VIDEO WALLPAPER (The Source of Audio) === */}
      {/* We make this fullscreen but cover it up. Browsers see it as "visible" so audio plays. */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="w-full h-full relative opacity-40">
           <ReactPlayer
             key={currentVideo?.video_id || 'empty'}
             // ✅ STANDARD URL
             url={currentVideo ? `https://www.youtube.com/watch?v=${currentVideo.video_id}` : ''}
             playing={true}
             volume={volume}
             muted={false}        // Must be false for audio!
             width="100%"
             height="100%"
             style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }}
             
             onEnded={playNext}
             onStart={() => setIsPlaying(true)}
             onPause={() => setIsPlaying(false)}
             onError={(e: any) => console.error("Playback Error:", e)}
             
             // Optimization: Hide controls, cleaner look
             config={{ youtube: { playerVars: { controls: 0, showinfo: 0, disablekb: 1 } } }}
           />
        </div>
        {/* Dark Overlay so text is readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/40 backdrop-blur-sm"></div>
      </div>

      {/* === LAYER 2: LEFT PANEL (Now Playing / Vinyl) === */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 min-h-[50vh] md:min-h-screen border-r border-white/5">
         
         {/* Vinyl Animation */}
         <motion.div 
           animate={{ rotate: isPlaying ? 360 : 0 }}
           transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
           className="relative w-64 h-64 md:w-[500px] md:h-[500px] rounded-full shadow-2xl border-8 border-slate-900 bg-black flex items-center justify-center"
         >
           {/* Vinyl Grooves */}
           <div className="absolute inset-0 rounded-full border-[2px] border-white/10 opacity-50"></div>
           <div className="absolute inset-0 rounded-full border-[40px] border-neutral-900/80 pointer-events-none"></div>
           <div className="absolute inset-0 rounded-full border-[100px] border-neutral-800/40 pointer-events-none"></div>
           
           {/* Center Label (Thumbnail) */}
           <div className="relative w-[35%] h-[35%] rounded-full overflow-hidden border-4 border-slate-950 shadow-inner z-20 bg-brand-dark">
             {currentVideo ? (
                <Image src={currentVideo.thumbnail} alt="art" fill className="object-cover" />
             ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <Disc3 size={48} />
                </div>
             )}
           </div>
         </motion.div>

         {/* Now Playing Info */}
         <div className="mt-12 text-center space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              {isPlaying ? (
                <div className="flex gap-1 items-end h-3">
                   <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-brand-pink rounded-full"/>
                   <motion.div animate={{ height: [4, 16, 4] }} transition={{ repeat: Infinity, duration: 0.4 }} className="w-1 bg-brand-pink rounded-full"/>
                   <motion.div animate={{ height: [4, 10, 4] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-brand-pink rounded-full"/>
                </div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-500" />
              )}
              <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                {isPlaying ? "On Air" : "Waiting for Queue"}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight drop-shadow-lg">
              {currentVideo?.title || "Jukebox Ready"}
            </h1>
            
            {currentVideo && (
               <p className="text-lg text-brand-yellow font-medium opacity-80">
                 Now Spinning at The IDEA
               </p>
            )}
         </div>
      </div>

      {/* === LAYER 3: RIGHT PANEL (Queue List) === */}
      <div className="relative z-10 w-full md:w-[400px] bg-slate-950/80 border-l border-white/5 backdrop-blur-xl flex flex-col h-[50vh] md:h-screen">
         
         {/* Header */}
         <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
           <div className="flex items-center gap-3">
             <Radio className="text-brand-pink" size={20} />
             <h2 className="font-bold text-sm uppercase tracking-widest">Up Next</h2>
             <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full text-slate-400">{queue.length}</span>
           </div>
           
           {currentVideo && (
             <button 
               onClick={playNext}
               className="text-xs font-bold text-white hover:text-brand-yellow flex items-center gap-2 transition-colors"
             >
               <SkipForward size={14} /> Skip
             </button>
           )}
         </div>

         {/* Scrollable List */}
         <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
           {queue.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                <Mic2 size={40} className="opacity-20" />
                <p className="text-sm font-medium italic">The stage is empty.</p>
                <div className="px-4 py-2 rounded-lg border border-dashed border-white/10 text-xs">
                  Scan QR to Request
                </div>
             </div>
           ) : (
             queue.map((item, i) => (
               <div key={item.id} className="group flex gap-3 items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all">
                 <span className="text-slate-500 font-mono text-xs w-4">{i + 1}</span>
                 
                 <div className="relative w-16 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-800">
                    <Image src={item.thumbnail} alt="thumb" fill className="object-cover group-hover:scale-110 transition duration-500" />
                 </div>
                 
                 <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-200 truncate group-hover:text-white transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Requested</p>
                 </div>
               </div>
             ))
           )}
         </div>

         {/* Volume Control Footer */}
         <div className="p-6 border-t border-white/5 bg-slate-900/90">
            <div className="flex items-center gap-4 text-slate-400">
               {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
               <input 
                 type="range" 
                 min="0" 
                 max="1" 
                 step="0.1" 
                 value={volume} 
                 onChange={(e) => setVolume(parseFloat(e.target.value))}
                 className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-pink"
               />
            </div>
         </div>

      </div>

    </div>
  );
}
