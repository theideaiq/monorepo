'use client';

import {
  motion,
  useInView,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  ArrowDown,
  Disc,
  Gamepad2,
  type LucideIcon,
  MonitorPlay,
  Play,
  Tv,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';

// --- DATA: The Eras ---
interface Era {
  id: string;
  year: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  bg: string;
  icon: LucideIcon;
  memories: string[];
  quote: string;
  synthType: 'square' | 'sawtooth' | 'sine'; // Different sound for each era
}

const ERAS: Era[] = [
  {
    id: 'era-80s',
    year: '1980s-1990s',
    title: 'The Pixel Dawn',
    subtitle: "When everything was 'Atari'",
    description:
      "The era of the 'Sakhr' computer and cloned NES consoles. We didn't save games; we memorized them. The screen flickered, the controllers were blocky, and Captain Majid was the hero.",
    color: '#4ade80',
    bg: 'bg-slate-950',
    icon: Gamepad2,
    memories: ['Captain Majid', 'Super Mario Bros', 'Duck Hunt', 'Contra'],
    quote: "Blow into the cartridge if it doesn't work.",
    synthType: 'square', // 8-bit Nintendo sound
  },
  {
    id: 'era-90s',
    year: '1995-2000',
    title: 'The Grey Legend',
    subtitle: 'The PlayStation 1 Revolution',
    description:
      'The startup sound that defined a generation. Gaming cafes (salas) opened on every corner. We learned teamwork from Crash Bash and rivalry from Tekken 3.',
    color: '#a855f7',
    bg: 'bg-[#111827]',
    icon: Disc,
    memories: [
      'Pepsiman',
      'Winning Eleven 3',
      'Crash Bandicoot',
      'Tekken 3',
      'Driver',
    ],
    quote: 'Roberto Carlos at Forward. Speed 99.',
    synthType: 'sawtooth', // Sharper, techy sound
  },
  {
    id: 'era-00s',
    year: '2000-2010',
    title: 'The Golden Age',
    subtitle: 'San Andreas & The Black Box',
    description:
      "The PS2 era. The world got bigger. We spent hours in GTA San Andreas (often the modded 'Baghdad' versions) and perfected our master league teams.",
    color: '#3b82f6',
    bg: 'bg-black',
    icon: MonitorPlay,
    memories: [
      'GTA: San Andreas',
      'God of War',
      'Need for Speed: Underground',
      'PES 6',
    ],
    quote: 'Red Screen of Death = Pure Panic.',
    synthType: 'sine', // Smooth, modern sound
  },
];

// --- COMPONENTS ---

const CRTOverlay = () => (
  <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden opacity-10">
    <div className="h-full w-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
  </div>
);

const FloatingItem = ({
  children,
  speed = 1,
  className,
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -200 * speed]);
  return (
    <motion.div style={{ y }} className={className}>
      {children}
    </motion.div>
  );
};

// --- AUDIO LOGIC ---
// We create a custom hook to handle the synthesis so it doesn't clutter the UI code
const useRetroSound = () => {
  const synth = useRef<Tone.PolySynth | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    // Initialize Synth on Mount
    synth.current = new Tone.PolySynth(Tone.Synth).toDestination();
    synth.current.volume.value = -10; // Lower volume so it's not annoying

    return () => {
      synth.current?.dispose();
    };
  }, []);

  const playHover = useCallback(
    (type: 'square' | 'sawtooth' | 'sine') => {
      if (isMuted || !synth.current) return;

      // Configure synth on the fly based on Era
      synth.current.set({ oscillator: { type } });

      // Play a random short note from a pentatonic scale
      const notes = ['C5', 'D5', 'E5', 'G5', 'A5'];
      const randomNote = notes[Math.floor(Math.random() * notes.length)];
      synth.current.triggerAttackRelease(randomNote, '32n');
    },
    [isMuted],
  );

  const playStart = useCallback(async () => {
    if (!synth.current) return;
    await Tone.start(); // Unlock Audio Context
    setIsMuted(false);

    // "Power Up" Sound
    synth.current.set({ oscillator: { type: 'square' } });
    synth.current.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '8n');
  }, []);

  const toggleMute = () => {
    if (isMuted) {
      Tone.start();
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  };

  return { playHover, playStart, toggleMute, isMuted };
};

// 3. Era Section (Now with Audio Props)
const EraSection = ({
  data,
  index,
  playSound,
}: {
  data: Era;
  index: number;
  playSound: (t: 'square' | 'sawtooth' | 'sine') => void;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: '-30% 0px -30% 0px' });

  return (
    <section
      ref={ref}
      className={`min-h-screen sticky top-0 flex items-center justify-center overflow-hidden ${data.bg} transition-colors duration-700`}
    >
      {/* Dynamic Backgrounds */}
      <div className="absolute inset-0 opacity-20">
        <div
          className={`absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-${data.color}/20`}
        />
        {index === 0 && (
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/pixel-weave.png')]" />
        )}
        {index === 1 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/20 blur-[100px] rounded-full animate-pulse" />
        )}
        {index === 2 && (
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black" />
        )}
      </div>

      <div className="container relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center px-6">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="inline-block px-4 py-1 mb-4 rounded-full border border-white/20 text-white/60 text-sm font-mono tracking-widest uppercase">
            {data.year}
          </div>
          <h2
            className="text-6xl md:text-8xl font-black text-white mb-2 tracking-tighter"
            style={{ textShadow: `0 0 30px ${data.color}` }}
          >
            {data.title}
          </h2>
          <h3 className="text-2xl md:text-3xl font-bold text-white/80 mb-6 font-arabic">
            {data.subtitle}
          </h3>
          <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-lg">
            {data.description}
          </p>

          <div className="space-y-4 border-l-2 border-white/10 pl-6">
            <p className="text-sm text-slate-500 uppercase tracking-widest">
              Iconic Memories
            </p>
            <div className="flex flex-wrap gap-3">
              {data.memories.map((mem, i) => (
                <motion.span
                  // biome-ignore lint/suspicious/noArrayIndexKey: static list
                  key={i}
                  onMouseEnter={() => playSound(data.synthType)} // PLAY SOUND ON HOVER
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={
                    isInView
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 0, scale: 0.8 }
                  }
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="px-3 py-1 bg-white/10 text-white rounded-md text-sm font-medium hover:bg-white hover:text-black transition-colors cursor-default hover:scale-105 active:scale-95"
                >
                  {mem}
                </motion.span>
              ))}
            </div>
          </div>

          <div className="mt-8 italic text-slate-500 font-mono text-xs">
            &quot;{data.quote}&quot;
          </div>
        </motion.div>

        <div className="relative h-[500px] flex items-center justify-center">
          <motion.div
            animate={
              isInView
                ? { scale: [0.9, 1.1, 1], rotate: [0, 5, -5, 0] }
                : { scale: 0.5 }
            }
            transition={{
              duration: 5,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: 'reverse',
            }}
            className="relative z-20 text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.3)]"
          >
            <div style={{ color: data.color }}>
              <data.icon size={200} />
            </div>
          </motion.div>

          <FloatingItem
            speed={0.5}
            className="absolute top-0 right-10 text-white/10"
          >
            <Tv size={80} />
          </FloatingItem>
          <FloatingItem
            speed={1.2}
            className="absolute bottom-20 left-10 text-white/10"
          >
            <Zap size={60} />
          </FloatingItem>

          <div
            className={`absolute inset-0 bg-gradient-to-r from-${data.color}/0 via-${data.color}/10 to-${data.color}/0 blur-3xl`}
          />
        </div>
      </div>
    </section>
  );
};

// --- MAIN PAGE ---

export default function RetroPage() {
  const { scrollYProgress } = useScroll();
  const { playHover, playStart, toggleMute, isMuted } = useRetroSound();

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div className="bg-black min-h-screen text-white font-sans selection:bg-brand-pink selection:text-white cursor-default">
      <CRTOverlay />

      {/* Sound Toggle */}
      <div className="fixed top-24 right-6 z-50">
        <button
          type="button"
          onClick={toggleMute}
          className="bg-black/50 backdrop-blur border border-white/20 p-3 rounded-full hover:bg-white hover:text-black transition-all"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-brand-pink origin-left z-50"
        style={{ scaleX }}
      />

      {/* 1. HERO SECTION */}
      <section className="h-screen flex flex-col items-center justify-center relative overflow-hidden bg-black">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2000')] bg-cover bg-center opacity-20 blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1 }}
          className="relative z-10 text-center px-4"
        >
          {/* The Start Button */}
          <motion.button
            onClick={playStart}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mb-8 inline-flex items-center gap-2 bg-brand-yellow/20 text-brand-yellow border border-brand-yellow px-6 py-2 rounded-full font-mono uppercase tracking-[0.2em] text-sm hover:bg-brand-yellow hover:text-black transition-colors"
          >
            <Play size={12} fill="currentColor" />
            {isMuted ? 'Click to Enable Sound' : 'Sound Enabled'}
          </motion.button>

          <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">
            RETRO
            <br />
            ROOM
          </h1>

          <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto font-light">
            A time machine built for gamers. <br /> From the 8-bit past to the
            high-def future.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 10, 0] }}
          transition={{
            delay: 2,
            repeat: Number.POSITIVE_INFINITY,
            duration: 2,
          }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-500"
        >
          <ArrowDown size={32} />
        </motion.div>
      </section>

      {/* 2. THE ERAS */}
      {ERAS.map((era, i) => (
        <EraSection key={era.id} data={era} index={i} playSound={playHover} />
      ))}
    </div>
  );
}
