import type React from 'react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  const uniqueId = useId();
  const id = props.id || uniqueId;
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          'w-full px-4 py-3 rounded-lg border bg-white transition-all outline-none min-h-[120px] resize-y',
          error
            ? 'border-red-500 focus:ring-2 focus:ring-red-200'
            : 'border-slate-200 focus:border-brand-pink focus:ring-2 focus:ring-pink-100',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
