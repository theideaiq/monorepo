'use client';

import { useEffect } from 'react';
import { AlertOctagon } from 'lucide-react';
import './globals.css'; // We must import CSS manually since Layout is gone

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body className="bg-slate-50 font-sans text-brand-dark flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-lg">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertOctagon size={48} className="text-red-600" />
          </div>

          <h1 className="text-4xl font-black mb-4">Critical System Failure</h1>
          <p className="text-slate-500 mb-8 text-lg">
            The application core has encountered an unrecoverable error. We
            apologize for the interruption.
          </p>

          <button
            onClick={() => reset()}
            className="bg-brand-dark text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg"
          >
            Attempt System Reset
          </button>
        </div>
      </body>
    </html>
  );
}
