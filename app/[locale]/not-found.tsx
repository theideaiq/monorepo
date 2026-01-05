'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useRouter } from '@/navigation';
import { ArrowLeft, Home, Search } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 font-sans">
      
      {/* Glitchy Text Effect */}
      <div className="relative mb-6">
        <h1 className="text-9xl font-black text-slate-100 tracking-tighter select-none">404</h1>
        <div className="absolute inset-0 text-9xl font-black text-brand-pink/10 animate-pulse" style={{ animationDelay: '0.1s' }}>404</div>
        <div className="absolute inset-0 text-9xl font-black text-brand-yellow/10 animate-pulse" style={{ animationDelay: '0.2s' }}>404</div>
      </div>

      <h2 className="text-3xl font-bold text-brand-dark mb-4">Lost in the System?</h2>
      <p className="text-slate-500 max-w-md mb-10 text-lg">
        The page you are looking for might have been moved, deleted, or possibly never existed in this timeline.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={() => router.push('/')}
          className="h-14 px-8 rounded-xl font-bold bg-brand-dark text-white hover:bg-slate-800"
        >
          <Home size={18} className="mr-2" /> Back Home
        </Button>
        
        <Button 
          onClick={() => router.push('/megastore')}
          variant="outline"
          className="h-14 px-8 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <Search size={18} className="mr-2" /> Search Store
        </Button>
      </div>
    </div>
  );
}
