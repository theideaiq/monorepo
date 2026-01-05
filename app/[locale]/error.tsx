'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

// Error components must be Client Components
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 font-sans">
      
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
        <AlertTriangle size={40} className="text-red-500" />
      </div>

      <h2 className="text-3xl font-bold text-brand-dark mb-4">System Critical Error</h2>
      <p className="text-slate-500 max-w-md mb-8">
        Something went wrong on our end. The system has logged this incident and our engineers have been notified.
      </p>

      <div className="flex gap-4">
        <Button 
          onClick={
            // Attempt to recover by trying to re-render the segment
            () => reset()
          }
          className="h-12 px-8 rounded-xl font-bold bg-brand-pink text-white hover:bg-pink-600 shadow-lg shadow-brand-pink/20"
        >
          <RefreshCcw size={18} className="mr-2" /> Try Again
        </Button>
      </div>

      {/* Developer Error Details (Hidden in Production usually, but helpful for you now) */}
      <div className="mt-12 p-4 bg-slate-100 rounded-lg max-w-2xl w-full text-left overflow-hidden">
        <p className="font-mono text-xs text-slate-500 mb-2 uppercase tracking-bold">Error Digest: {error.digest}</p>
        <p className="font-mono text-sm text-red-600 break-words">{error.message}</p>
      </div>
    </div>
  );
}
