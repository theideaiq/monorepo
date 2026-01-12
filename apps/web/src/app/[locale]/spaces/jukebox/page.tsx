'use client';

import { Button } from '@/components/ui/button/Button';
import { decodeHtmlEntities } from '@/lib/string-utils';
import { createClient } from '@/lib/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Clock,
  Disc3,
  Info,
  Music,
  Plus,
  Radio,
  Search,
} from 'lucide-react';
import Image from 'next/image';
import type React from 'react';
import { useState } from 'react';

interface VideoResult {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration: string;
}

export default function JukeboxGuest() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState<string | null>(null);

  const supabase = createClient();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResults([]);

    try {
      const res = await fetch(
        `/api/youtube/search?q=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      setResults(data.items || []);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const addToQueue = async (video: VideoResult) => {
    if (cooldown) return;
    setCooldown(video.id);
    const { error } = await supabase.from('jukebox_queue').insert({
      video_id: video.id,
      title: video.title,
      thumbnail: video.thumbnail,
      status: 'pending',
    });
    if (error) {
      console.error('Supabase Error:', error);
      setCooldown(null);
    } else {
      setTimeout(() => setCooldown(null), 2000);
    }
  };

  return (
    // ✅ FIX: Added 'pt-24' to push content below the Navbar
    <div className="min-h-screen bg-brand-dark text-white font-sans selection:bg-brand-pink selection:text-white pb-20 pt-24">
      {/* HERO HEADER */}
      <div className="relative overflow-hidden bg-brand-dark pb-12 px-6 text-center border-b border-white/5">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-pink/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-brand-yellow/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest mb-4 text-brand-yellow">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live at The IDEA
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
            YOU ARE THE{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-pink to-brand-yellow">
              DJ.
            </span>
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto text-lg leading-relaxed">
            Control the room vibe. Search for a track, add it to the queue, and
            watch it play on the big screen.
          </p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="sticky top-24 z-40 px-4 -mt-8 mb-8">
        <div className="max-w-xl mx-auto drop-shadow-2xl">
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-pink to-brand-yellow blur-xl rounded-2xl opacity-0 group-focus-within:opacity-50 transition duration-500" />
            <div className="relative flex bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
              <input
                type="text"
                placeholder="Search artist, song, or vibe..."
                className="flex-1 bg-transparent px-6 h-16 text-lg text-white placeholder:text-slate-500 focus:outline-none font-medium"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button
                type="submit"
                className="h-16 w-20 rounded-none bg-brand-pink hover:bg-pink-600 text-white flex items-center justify-center transition-all"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Search size={24} />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* RESULTS LIST */}
      <div className="max-w-xl mx-auto px-4 space-y-4 min-h-[300px]">
        {results.length === 0 && !loading && (
          <div className="text-center py-12 flex flex-col items-center opacity-50 space-y-4">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
              <Disc3
                size={40}
                className="text-brand-yellow animate-spin-slow"
                style={{ animationDuration: '8s' }}
              />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Queue is Waiting</h3>
              <p className="text-sm text-slate-400">
                Search for a banger to get started.
              </p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {results.map((video, i) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group flex gap-4 items-center bg-slate-900/50 backdrop-blur-md border border-white/5 p-3 rounded-2xl hover:bg-white/10 hover:border-brand-pink/30 transition-all duration-300"
            >
              <div className="relative w-32 h-20 rounded-xl overflow-hidden shrink-0 shadow-lg group-hover:shadow-brand-pink/20 transition-all">
                <Image
                  src={video.thumbnail}
                  alt={video.title}
                  fill
                  className="object-cover group-hover:scale-110 transition duration-700"
                />
                <div className="absolute bottom-1 right-1 bg-black/80 text-[10px] font-bold px-1.5 py-0.5 rounded text-white backdrop-blur-sm">
                  {video.duration}
                </div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                <h3 className="font-bold text-sm leading-snug line-clamp-2 text-white group-hover:text-brand-yellow transition-colors mb-1">
                  {decodeHtmlEntities(video.title)}
                </h3>
                <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  {video.channel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => addToQueue(video)}
                disabled={cooldown !== null}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg transform ${cooldown === video.id ? 'bg-green-500 text-black scale-100' : 'bg-white/10 text-white hover:bg-brand-pink hover:scale-110'}`}
              >
                {cooldown === video.id ? (
                  <Check size={24} />
                ) : (
                  <Plus size={24} />
                )}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* HOUSE RULES */}
      <div className="max-w-xl mx-auto px-4 mt-20">
        <div className="bg-white/5 border border-white/5 rounded-3xl p-8 backdrop-blur-sm">
          <h3 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-2">
            <Info size={24} className="text-brand-pink" /> House Rules
          </h3>
          <div className="grid gap-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-yellow/10 flex items-center justify-center shrink-0">
                <Music size={20} className="text-brand-yellow" />
              </div>
              <div>
                <h4 className="font-bold text-white">Music Only</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Our AI filters out podcasts and tutorials.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-pink/10 flex items-center justify-center shrink-0">
                <Clock size={20} className="text-brand-pink" />
              </div>
              <div>
                <h4 className="font-bold text-white">Time Limits</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Tracks must be under 10 minutes.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                <Radio size={20} className="text-purple-400" />
              </div>
              <div>
                <h4 className="font-bold text-white">Fair Play</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  The queue is first-come, first-served.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
