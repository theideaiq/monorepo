import { cn } from '@repo/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import type React from 'react';

const badgeVariants = cva(
  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border',
  {
    variants: {
      variant: {
        success: 'bg-green-100 text-green-800 border-green-200',
        warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        danger: 'bg-red-100 text-red-800 border-red-200',
        neutral: 'bg-slate-100 text-slate-600 border-slate-200',
        brand: 'bg-pink-50 text-brand-pink border-pink-100',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * A small status indicator component.
 *
 * @example
 * <Badge variant="success">Completed</Badge>
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
