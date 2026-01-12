'use client';

import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from '@/i18n/navigation';

export default function AccessDenied() {
  const router = useRouter();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 font-sans">
      <div className="mb-6 relative">
        <ShieldAlert size={80} className="text-slate-200" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-black text-brand-pink">403</span>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-brand-dark mb-4">
        Access Restricted
      </h1>
      <p className="text-slate-500 max-w-md mb-8">
        You do not have the necessary permissions to view this secure area. This
        event has been logged.
      </p>

      <Button
        onClick={() => router.push('/')}
        variant="outline"
        className="h-12 px-8 rounded-xl font-bold"
      >
        <ArrowLeft size={18} className="mr-2 rtl:rotate-180" /> Return to Safety
      </Button>
    </div>
  );
}
