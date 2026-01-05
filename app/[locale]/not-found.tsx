'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, Terminal, Gamepad2, Coffee, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

// The "Multiverse" of 404 Errors
const scenarios = [
  {
    id: 'matrix',
    theme: 'bg-black text-green-500 font-mono',
    icon: <Terminal className="w-24 h-24 mb-6 animate-pulse" />,
    title: "SYSTEM FAILURE",
    message: "A glitch in the matrix has occurred. This page does not exist in this simulation.",
    button: "Jack Out (Go Home)",
    accent: "border-green-500 hover:bg-green-500 hover:text-black"
  },
  {
    id: 'gaming',
    theme: 'bg-indigo-900 text-white font-sans',
    icon: <Gamepad2 className="w-24 h-24 mb-6 text-yellow-400" />,
    title: "GAME OVER",
    message: "The princess is in another castle. You've ventured into an unmapped level.",
    button: "Respawn (Go Home)",
    accent: "bg-yellow-400 text-indigo-900 hover:bg-yellow-300 border-transparent"
  },
  {
    id: 'spooky',
    theme: 'bg-slate-900 text-purple-400',
    icon: <Ghost className="w-24 h-24 mb-6 animate-bounce" />,
    title: "It's a Ghost Town...",
    message: "There's nothing here but digital cobwebs and lost packets. Turn back before it's too late.",
    button: "Run Away (Go Home)",
    accent: "border-purple-400 hover:bg-purple-400 hover:text-slate-900"
  },
  {
    id: 'coffee',
    theme: 'bg-[#3C2A21] text-[#E5E5CB]',
    icon: <Coffee className="w-24 h-24 mb-6" />,
    title: "404: Caffeine Depleted",
    message: "Our developer went to get coffee and forgot to build this page. It happens.",
    button: "Back to Safety",
    accent: "bg-[#D5CEA3] text-[#1A120B] hover:bg-white border-transparent"
  },
  {
    id: 'construction',
    theme: 'bg-brand-yellow text-brand-dark', // Using your brand colors!
    icon: <AlertTriangle className="w-24 h-24 mb-6" />,
    title: "UNDER CONSTRUCTION",
    message: "We are currently welding this page together. Mind the sparks.",
    button: "Return to Base",
    accent: "bg-black text-brand-yellow hover:bg-gray-800 border-transparent"
  }
];

export default function NotFound() {
  // ⚡ Bolt Optimization: Initialize state randomly without useEffect to avoid double-render.
  // Using suppressHydrationWarning to handle the inevitable mismatch.
  const [scenario, setScenario] = useState(() => scenarios[Math.floor(Math.random() * scenarios.length)]);

  const reroll = () => {
    let newScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    // Make sure we don't get the same one twice in a row
    while (newScenario.id === scenario.id) {
        newScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    }
    setScenario(newScenario);
  };

  return (
    <div
      suppressHydrationWarning
      className={`min-h-screen w-full flex flex-col items-center justify-center p-4 transition-colors duration-700 ${scenario.theme}`}
    >
      
      <AnimatePresence mode="wait">
        <motion.div
          key={scenario.id}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.1, y: -20 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-lg"
        >
          <div className="flex justify-center" suppressHydrationWarning>{scenario.icon}</div>
          
          <h1 className="text-6xl font-black tracking-tighter mb-4" suppressHydrationWarning>{scenario.title}</h1>
          <p className="text-xl mb-12 opacity-80 font-medium leading-relaxed" suppressHydrationWarning>
            {scenario.message}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/"
              suppressHydrationWarning
              className={`px-8 py-3 rounded-full font-bold border-2 transition-all transform hover:scale-105 flex items-center gap-2 ${scenario.accent}`}
            >
              <ArrowLeft size={20} />
              {scenario.button}
            </Link>

            <button 
              onClick={reroll}
              className="px-6 py-3 rounded-full font-medium opacity-60 hover:opacity-100 transition-opacity flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Try Another Dimension
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
