import { cn } from '@repo/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-pink text-white hover:bg-pink-600 shadow-sm hover:shadow-md',
        secondary:
          'bg-brand-yellow text-brand-dark hover:bg-yellow-400 shadow-sm hover:shadow-md',
        dark: 'bg-brand-dark text-white hover:bg-slate-800 shadow-sm hover:shadow-md',
        outline:
          'border border-slate-200 bg-white hover:bg-slate-100 text-slate-900',
        ghost: 'hover:bg-slate-100 hover:text-slate-900 text-slate-600',
        link: 'text-brand-pink underline-offset-4 hover:underline shadow-none p-0 h-auto',
        destructive:
          'bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-md',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * If true, displays a loading spinner.
   * Note: The button's children (text/icons) are hidden while loading to prevent layout shifts or double icons.
   */
  isLoading?: boolean;
}

/**
 * Primary UI button component.
 * Supports various variants, sizes, and a loading state.
 *
 * @param variant - Visual style of the button (primary, secondary, outline, etc.)
 * @param size - Size of the button (default, sm, lg, icon)
 * @param isLoading - Shows a spinner and disables the button if true.
 *
 * @example
 * <Button variant="primary" onClick={handleClick}>
 *   Click Me
 * </Button>
 *
 * @example
 * <Button variant="outline" isLoading={isSubmitting}>
 *   Submit
 * </Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, isLoading, children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {/* Hide children when loading to avoid double-icon issues (e.g. spinner + original icon) */}
        {!isLoading && children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
