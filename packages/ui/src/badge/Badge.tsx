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
        brand: 'bg-brand-pink text-brand-pink border-brand-pink',
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
 * The visual style of the badge is controlled by the {@link BadgeProps.variant | variant} prop:
 * - `success`: for positive states or completed items (e.g. "Completed", "Active").
 * - `warning`: for cautionary states that may require attention soon (e.g. "Expiring soon").
 * - `danger`: for error or critical states (e.g. "Failed", "Blocked").
 * - `neutral`: for default or informational states without strong emphasis.
 * - `brand`: for brand-related highlights or marketing emphasis.
 *
 * If no `variant` is provided, the badge defaults to the `neutral` variant.
 *
 * @param variant Controls the visual appearance of the badge. Accepts one of:
 * `success`, `warning`, `danger`, `neutral`, or `brand`.
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
