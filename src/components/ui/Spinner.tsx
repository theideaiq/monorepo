import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Spinner({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Loader2
      size={size}
      className={cn('animate-spin text-brand-pink', className)}
    />
  );
}

export function PageLoader() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-slate-400">
      <Spinner size={48} />
      <p className="text-sm font-medium animate-pulse">Loading System...</p>
    </div>
  );
}
