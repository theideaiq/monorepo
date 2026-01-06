'use client';

import { Hammer } from 'lucide-react';

export default function Maintenance() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 font-sans">
      <div className="w-20 h-20 bg-brand-yellow/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <Hammer size={40} className="text-brand-dark" />
      </div>

      <h1 className="text-4xl font-black text-brand-dark mb-4">
        Under Construction
      </h1>
      <p className="text-slate-500 max-w-md mb-8 text-lg">
        The IDEA is currently evolving. We are deploying updates to improve your
        experience.
      </p>

      <div className="inline-block bg-slate-100 px-4 py-2 rounded-lg">
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
          Estimated Return:{' '}
          <span className="text-brand-pink font-bold">30 Minutes</span>
        </p>
      </div>
    </div>
  );
}
