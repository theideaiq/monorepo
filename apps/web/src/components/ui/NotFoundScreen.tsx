'use client';

import { Compass } from 'lucide-react';
import Link from 'next/link';

export function NotFoundScreen() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-neutral-950 p-4 text-center select-none">
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full animate-pulse" />
        <Compass className="relative w-24 h-24 text-[#facc15] animate-pulse" />
      </div>

      <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-6xl">
        Coordinates Not Found.
      </h1>

      <p className="mb-12 text-lg text-neutral-400 font-medium">
        The signal was lost in the void.
      </p>

      <Link
        href="/"
        className="px-8 py-3 rounded-full font-bold bg-[#facc15] text-neutral-950 hover:bg-yellow-300 transition-colors transform hover:scale-105 active:scale-95"
      >
        Return to Command
      </Link>
    </div>
  );
}
