'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { Gamepad2, Disc, Tv, Zap, MonitorPlay, ArrowDown, Play, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// --- DATA: The Eras of Iraqi Gaming ---
// FIX: We store the component itself (LucideIcon), not a JSX Element
interface Era {
  id: string;
  year: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  bg: string;
  icon: LucideIcon; // <--- Changed from JSX.Element to Component Type
  memories: string[];
  quote: string;
}

const ERAS: Era[] = [
  {
    id: "era-80s",
    year: "1980s-1990s",
    title: "The Pixel Dawn",
    subtitle: "When everything was 'Atari'",
    description: "The era of the 'Sakhr' computer and cloned NES consoles. We didn't save games; we memorized them. The screen flickered, the controllers were blocky, and Captain Majid was the hero.",
    color: "#4ade80", 
    bg: "bg-slate-950",
    icon: Gamepad2, // <--- Passing the component directly
    memories: ["Captain Majid", "Super Mario Bros", "Duck Hunt", "Contra"],
    quote: "Blow into the cartridge if it doesn't work."
  },
  {
    id: "era-90s",
    year: "1995-2000",
    title: "The Grey Legend",
    subtitle: "The PlayStation 1 Revolution",
    description: "The startup sound that defined a generation. Gaming cafes (salas) opened on every corner. We learned teamwork from Crash Bash and rivalry from Tekken 3.",
    color: "#a855f7", 
    bg: "bg-[#111827]",
    icon: Disc, // <--- Passing the component directly
    memories: ["Pepsiman", "Winning Eleven 3", "Crash Bandicoot", "Tekken 3", "Driver"],
    quote: "Roberto Carlos at Forward. Speed 99."
  },
  {
    id: "era-00s",
    year: "2000-2010",
    title: "The Golden Age",
    subtitle: "San Andreas & The Black Box",
    description: "The PS2 era. The world got bigger. We spent hours in GTA San Andreas (often the modded 'Baghdad' versions) and perfected our master league teams.",
    color: "#3b82f6", 
    bg: "bg-black",
    icon: MonitorPlay, // <--- Passing the component directly
    memories: ["GTA: San Andreas", "God of War", "Need for Speed: Underground", "PES 6"],
    quote: "Red Screen of Death = Pure Panic."
  }
];

// --- COMPONENTS ---

// 1. CRT Scanline Overlay
const CRTOverlay = () => (
  <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden opacity-10">
    <div className="h-full w-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
  </div>
);

// 2. Parallax Floating Item
const FloatingItem = ({ children, speed = 1, className }: { children: React.ReactNode, speed?: number, className?: string }) => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -200 * speed]);
  return <motion.div style={{ y }} className={className}>{children}</motion.div>;
};

// 3. Era Section
const EraSection = ({ data, index }: { data: Era, index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "-30% 0px -30% 0px" });

  return (
    <section ref={ref} className={`min-h-screen sticky top-0 flex items-center justify-center overflow-hidden ${data.bg} transition-colors duration-700`}>
      
      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-20">
         <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-${data.color}/20`} />
         {index === 0 && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/pixel-weave.png')]" />}
         {index === 1 && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/20 blur-[100px] rounded-full animate-pulse" />}
         {index === 2 && <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black" />}
      </div>

      <div className="container relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center px-6">
        
        {/* Text Content */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="inline-block px-4 py-1 mb-4 rounded-full border border-white/20 text-white/60 text-sm font-mono tracking-widest uppercase">
            {data.year}
          </div>
          <h2 className="text-6xl md:text-8xl font-black text-white mb-2 tracking-tighter" style={{ textShadow: `0 0 30px ${data.color}` }}>
            {data.title}
          </h2>
          <h3 className="text-2xl md:text-3xl font-bold text-white/80 mb-6 font-arabic">
            {data.subtitle}
          </h3>
          <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-lg">
            {data.description}
          </p>
          
          <div className="space-y-4 border-l-2 border-white/10 pl-6">
             <p className="text-sm text-slate-500 uppercase tracking-widest">Iconic Memories</p>
             <div className="flex flex-wrap gap-3">
               {data.memories.map((mem, i) => (
                 <motion.span 
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                    transition={{ delay: 0.5 + (i * 0.1) }}
                    className="px-3 py-1 bg-white/10 text-white rounded-md text-sm font-medium hover:bg-white hover:text-black transition-colors cursor-default"
                 >
                   {mem}
                 </motion.span>
               ))}
             </div>
          </div>

          <div className="mt-8 italic text-slate-500 font-mono text-xs">
            "{data.quote}"
          </div>
        </motion.div>

        {/* Visuals / 3D-ish Elements */}
        <div className="relative h-[500px] flex items-center justify-center">
           {/* Main Icon */}
           <motion.div 
             animate={isInView ? { scale: [0.9, 1.1, 1], rotate: [0, 5, -5, 0] } : { scale: 0.5 }}
             transition={{ duration: 5, repeat: Infinity, repeatType: "reverse" }}
             className="relative z-20 text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.3)]"
           >
             <div style={{ color: data.color }}>
                {/* FIX: Render the component directly with the size prop */}
                <data.icon size={200} />
             </div>
           </motion.div>

           {/* Floating Particles */}
           <FloatingItem speed={0.5} className="absolute top-0 right-10 text-white/10">
              <Tv size={80} />
           </FloatingItem>
           <FloatingItem speed={1.2} className="absolute bottom-20 left-10 text-white/10">
              <Zap size={60} />
           </FloatingItem>
           
           {/* Circle Glow */}
           <div className={`absolute inset-0 bg-gradient-to-r from-${data.color}/0 via-${data.color}/10 to-${data.color}/0 blur-3xl`} />
        </div>

      </div>
    </section>
  );
};

// --- MAIN PAGE ---

export default function RetroPage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="bg-black min-h-screen text-white font-sans selection:bg-brand-pink selection:text-white">
      <CRTOverlay />
      
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-brand-pink origin-left z-50"
        style={{ scaleX }}
      />

      {/* 1. HERO SECTION */}
      <section className="h-screen flex flex-col items-center justify-center relative overflow-hidden bg-black">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2000')] bg-cover bg-center opacity-20 blur-sm"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
         
         <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1 }}
            className="relative z-10 text-center px-4"
         >
            <motion.div 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mb-6 inline-flex items-center gap-2 text-brand-yellow font-mono uppercase tracking-[0.2em] text-sm"
            >
              <Play size={12} fill="currentColor" /> Insert Coin to Start
            </motion.div>
            
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">
              RETRO<br/>ROOM
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto font-light">
              A time machine built for gamers. <br/> From the 8-bit past to the high-def future.
            </p>
         </motion.div>

         <motion.div 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1, y: [0, 10, 0] }}
           transition={{ delay: 2, duration: 2, repeat: Infinity }}
           className="absolute bottom-12 text-slate-500 flex flex-col items-center gap-2"
         >
           <span className="text-xs uppercase tracking-widest">Scroll to Time Travel</span>
           <ArrowDown size={20} />
         </motion.div>
      </section>

      {/* 2. THE JOURNEY (Stacked Sticky Sections) */}
      <div className="relative">
         {ERAS.map((era, index) => (
           <EraSection key={era.id} data={era} index={index} />
         ))}
      </div>

      {/* 3. CTA SECTION */}
      <section className="h-[80vh] flex flex-col items-center justify-center bg-[#0F172A] relative px-4 text-center">
         {/* Grid Background */}
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
         
         <div className="relative z-10 max-w-4xl">
            <h2 className="text-5xl md:text-7xl font-black mb-8 text-white">
              Ready for <span className="text-brand-pink">Player One?</span>
            </h2>
            <p className="text-xl text-slate-400 mb-12 leading-relaxed">
              The Retro Room is real. Located at The IDEA Spaces. <br/>
              Grab a controller, challenge your friends, and relive the glory days.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button className="h-16 px-12 text-xl bg-brand-pink hover:bg-pink-600 rounded-full font-bold shadow-[0_0_30px_rgba(233,30,99,0.4)]">
                Book a Session
              </Button>
              <Button variant="outline" className="h-16 px-12 text-xl border-slate-700 text-white hover:bg-white hover:text-black rounded-full font-bold">
                View Games List
              </Button>
            </div>
         </div>
      </section>

    </div>
  );
}
