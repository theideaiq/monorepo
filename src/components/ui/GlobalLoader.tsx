'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Terminal, Coffee, Gamepad2, Wifi, Zap } from 'lucide-react';

const LOADING_MESSAGES = [
  { text: 'Calibrating Flux Capacitor...', icon: <Zap size={24} /> },
  { text: 'Searching for best Shawarma in Baghdad...', icon: <SearchIcon /> },
  { text: 'Connecting to the Matrix...', icon: <Terminal size={24} /> },
  { text: 'Brewing Iraqi Tea...', icon: <Coffee size={24} /> },
  { text: 'Loading PS5 Graphics...', icon: <Gamepad2 size={24} /> },
  { text: 'Establishing Secure Uplink...', icon: <Wifi size={24} /> },
  { text: 'Mining imaginary Bitcoin...', icon: <Loader2 size={24} /> },
  { text: 'Waking up the hamsters...', icon: <Zap size={24} /> },
];

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-search"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export default function GlobalLoader() {
  const [isVisible, setIsVisible] = useState(true);

  // ⚡ Bolt Optimization: Initialize state with random value to avoid double-render effect.
  // We use suppressHydrationWarning on the output elements to handle the client/server mismatch.
  const [message] = useState(
    () => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)],
  );

  useEffect(() => {
    // Hide after 2 seconds (Simulate boot time)
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] bg-[#0f1014] flex flex-col items-center justify-center text-white"
        >
          <div className="flex flex-col items-center gap-6">
            {/* Logo Animation */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative w-20 h-20"
            >
              <div className="absolute inset-0 bg-brand-pink/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative z-10 w-full h-full bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center">
                <span className="text-3xl font-black text-white">
                  I<span className="text-brand-yellow">.</span>
                </span>
              </div>
            </motion.div>

            {/* The Easter Egg Message */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 text-slate-300 font-mono text-sm"
            >
              <span
                className="animate-spin text-brand-pink"
                suppressHydrationWarning
              >
                {message.icon}
              </span>
              <p suppressHydrationWarning>{message.text}</p>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-brand-pink to-brand-yellow"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.5, ease: 'circOut' }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
