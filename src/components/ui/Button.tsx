import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'dark' | 'outline' | 'ghost';
  isLoading?: boolean;
}

export function Button({ 
  className, 
  variant = 'primary', 
  isLoading, 
  children, 
  disabled, 
  ...props 
}: ButtonProps) {
  
  const variants = {
    primary: "bg-brand-pink text-white hover:bg-pink-600 shadow-md hover:shadow-lg",
    secondary: "bg-brand-yellow text-brand-dark hover:bg-yellow-400 shadow-md hover:shadow-lg",
    dark: "bg-brand-dark text-white hover:bg-slate-800 shadow-md hover:shadow-lg",
    outline: "border-2 border-brand-dark text-brand-dark hover:bg-slate-50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 shadow-none",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-6 py-3 font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2",
        variants[variant],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
