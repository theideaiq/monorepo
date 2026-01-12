import { ChevronDown } from 'lucide-react';
import type React from 'react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({
  label,
  error,
  options,
  className,
  ...props
}: SelectProps) {
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
      <div className="relative">
        <select
          id={id}
          className={cn(
            'w-full px-4 py-3 rounded-lg border bg-white transition-all outline-none appearance-none',
            'pr-10',
            error
              ? 'border-red-500 focus:ring-2 focus:ring-red-200'
              : 'border-slate-200 focus:border-brand-pink focus:ring-2 focus:ring-pink-100',
            className,
          )}
          {...props}
        >
          <option value="" disabled>
            Select an option
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Custom Arrow Icon */}
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          size={18}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
