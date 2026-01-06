import React from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'brand';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string; // <--- This was missing!
}

export function Badge({ children, variant = 'neutral', className = "" }: BadgeProps) {
  const styles = {
    success: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    danger: "bg-red-100 text-red-800 border-red-200",
    neutral: "bg-slate-100 text-slate-600 border-slate-200",
    brand: "bg-pink-50 text-brand-pink border-pink-100",
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border",
      styles[variant],
      className
    )}>
      {children}
    </span>
  );
}
