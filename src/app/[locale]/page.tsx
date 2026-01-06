'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, RefreshCw } from 'lucide-react';

/* --- ASSETS & CONFIG --- */
const SCENES = ['VINYL', 'TERMINAL', 'TV'];

// Konami Code Sequence
const KONAMI_CODE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

export default function ComingSoonPage() {
  const [currentScene, setCurrentScene] = useState<string | null>(null);
  const [konamiIndex, setKonamiIndex] = useState(0);
  const [isGodMode, setIsGodMode] = useState(false); // Secret Mode

  // 1. Randomize Scene on Mount (Client-Side Only)
  useEffect(() => {
    const randomScene = SCENES[Math.floor(Math.random() * SCENES.length)];
    const timeout = setTimeout(() => {
      setCurrentScene(randomScene);
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  // 2. Easter Egg Listener (Konami Code)
  useEffect(() => {
    const activateGodMode = () => {
      setIsGodMode(true);
      alert('🔓 GOD MODE ACTIVATED: You have unlocked the secret timeline.');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === KONAMI_CODE[konamiIndex]) {
        const nextIndex = konamiIndex + 1;
        if (nextIndex === KONAMI_CODE.length) {
          activateGodMode();
          setKonamiIndex(0);
        } else {
          setKonamiIndex(nextIndex);
        }
      } else {
        setKonamiIndex(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [konamiIndex]);

  const switchScene = () => {
    const nextIndex = (SCENES.indexOf(currentScene || '') + 1) % SCENES.length;
    setCurrentScene(SCENES[nextIndex]);
  };

  if (!currentScene) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen w-full overflow-hidden bg-black text-white relative font-sans selection:bg-brand-pink selection:text-white">
      {/* GLOBAL HUD (Always Visible) */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50 mix-blend-difference">
        <h1 className="font-black tracking-tighter text-2xl">
          THE IDEA <span className="text-xs align-top opacity-50">BETA</span>
        </h1>
        <button
          onClick={switchScene}
          className="hover:rotate-180 transition-transform duration-500"
        >
          <RefreshCw size={24} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* --- SCENE 1: THE VINYL LOUNGE --- */}
        {currentScene === 'VINYL' && <VinylScene key="vinyl" />}

        {/* --- SCENE 2: THE TERMINAL --- */}
        {currentScene === 'TERMINAL' && <TerminalScene key="terminal" />}

        {/* --- SCENE 3: THE RETRO TV --- */}
        {currentScene === 'TV' && <TVScene key="tv" />}
      </AnimatePresence>

      {/* GOD MODE OVERLAY */}
      {isGodMode && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-brand-pink text-white px-4 py-1 rounded-full text-xs font-bold animate-pulse shadow-[0_0_20px_#E91E63]">
          GOD MODE ACTIVE
        </div>
      )}
    </div>
  );
}

/* =========================================
   SCENE 1: THE VINYL PLAYER
   Interactive: Click to stop/start record
   ========================================= */
function VinylScene() {
  const [isPlaying, setIsPlaying] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center bg-neutral-900 relative"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-800 to-black opacity-50" />

      {/* The Turntable */}
      <div
        className="relative z-10 scale-75 md:scale-100 cursor-pointer group"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {/* Tonearm */}
        <motion.div
          animate={{ rotate: isPlaying ? 25 : 0 }}
          className="absolute -top-10 right-10 w-4 h-64 bg-neutral-700 origin-top z-20 rounded-full shadow-2xl border border-white/10"
          style={{ transformOrigin: 'top center' }}
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-12 bg-brand-yellow rounded-md shadow-lg" />
        </motion.div>

        {/* The Record */}
        <motion.div
          animate={{ rotate: isPlaying ? 360 : 0 }}
          transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
          className="w-96 h-96 rounded-full bg-black border-4 border-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center justify-center relative overflow-hidden"
        >
          {/* Grooves */}
          <div className="absolute inset-0 border-[2px] border-white/5 rounded-full" />
          <div className="absolute inset-4 border-[20px] border-neutral-900 rounded-full" />
          <div className="absolute inset-16 border-[40px] border-neutral-800/50 rounded-full" />

          {/* Label */}
          <div className="w-32 h-32 bg-brand-pink rounded-full flex items-center justify-center text-center p-2 shadow-inner">
            <div>
              <p className="text-[10px] font-bold text-black uppercase">
                The IDEA LP
              </p>
              <p className="text-[8px] font-mono text-white/80">
                Side B: &quot;Future Loading&quot;
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="mt-12 text-center z-10 space-y-2">
        <h2 className="text-4xl font-black italic tracking-tighter">
          {isPlaying ? 'SPINNING UP NEXT...' : 'PAUSED'}
        </h2>
        <p className="text-neutral-500 font-mono text-sm uppercase">
          Click the record to {isPlaying ? 'pause' : 'play'}
        </p>
      </div>
    </motion.div>
  );
}

/* =========================================
   SCENE 2: THE TERMINAL (Hacker)
   Interactive: Typing effect
   ========================================= */
function TerminalScene() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const bootSequence = [
      'Initializing IDEA_KERNEL v2.0...',
      'Loading assets... [OK]',
      'Connecting to Bagdad Mainframe... [CONNECTED]',
      'Optimizing User Experience... [IN PROGRESS]',
      'Refactoring Reality... [DONE]',
      'Almost there...',
    ];

    let delay = 0;
    bootSequence.forEach((line) => {
      delay += Math.random() * 800 + 500;
      setTimeout(() => {
        setLines((prev) => [...prev, line]);
      }, delay);
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-black font-mono p-8 md:p-24 text-green-500 flex flex-col justify-end"
    >
      <div className="max-w-3xl space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-2">
            <span className="opacity-50">{`>`}</span>
            <span
              className={
                line.includes('ERROR') ? 'text-red-500' : 'text-brand-yellow'
              }
            >
              {line}
            </span>
          </div>
        ))}
        <div className="animate-pulse">_</div>
      </div>

      <div className="absolute top-24 right-8 md:right-24 opacity-20">
        <Terminal size={200} />
      </div>

      <h2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-bold text-white/10 text-9xl pointer-events-none select-none">
        DEV
      </h2>
    </motion.div>
  );
}

/* =========================================
   SCENE 3: RETRO TV (Static)
   Interactive: Hover to clear static
   ========================================= */
function TVScene() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-indigo-900 flex items-center justify-center relative overflow-hidden"
    >
      {/* Static Noise Animation */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg className="w-full h-full filter contrast-150 brightness-150">
          <filter id="noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>

      <div className="relative z-10 bg-black p-4 rounded-3xl shadow-2xl border-4 border-neutral-800 rotate-1">
        {/* TV Screen */}
        <div className="w-[300px] h-[240px] md:w-[600px] md:h-[400px] bg-neutral-800 rounded-xl overflow-hidden relative border-8 border-neutral-900">
          {/* Color Bars */}
          <div className="h-full w-full flex flex-col">
            <div className="flex-1 flex">
              <div className="flex-1 bg-white" />
              <div className="flex-1 bg-yellow-400" />
              <div className="flex-1 bg-cyan-400" />
              <div className="flex-1 bg-green-400" />
              <div className="flex-1 bg-magenta-400" />
              <div className="flex-1 bg-red-400" />
              <div className="flex-1 bg-blue-400" />
            </div>
            <div className="h-1/4 bg-black flex items-center justify-center">
              <p className="text-white font-mono uppercase tracking-widest animate-pulse">
                Please Stand By
              </p>
            </div>
          </div>

          {/* Glitch Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent h-4 w-full animate-scanline pointer-events-none" />
        </div>

        {/* Knobs */}
        <div className="absolute right-[-40px] top-10 flex flex-col gap-4">
          <div className="w-8 h-8 rounded-full bg-neutral-800 border-2 border-neutral-600" />
          <div className="w-8 h-8 rounded-full bg-neutral-800 border-2 border-neutral-600" />
        </div>
      </div>

      <div className="absolute bottom-12 text-center">
        <p className="text-indigo-300 font-bold uppercase tracking-wider text-sm">
          Broadcast Date: 2026
        </p>
      </div>
    </motion.div>
  );
}
