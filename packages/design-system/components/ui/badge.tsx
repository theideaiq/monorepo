import * as React from "react"
import { Slot as SlotPrimitive } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@repo/design-system/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        // Tones from DESIGN_SYSTEM.md section 4. Status tones (success,
        // warning, danger) always carry an icon and a word.
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-idea-pink-hover",
        brand:
          "border-transparent bg-idea-pink text-on-pink [a&]:hover:bg-idea-pink-hover",
        neutral:
          "border-transparent bg-surface-sunken text-ink [a&]:hover:bg-surface-sunken/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        highlight: "border-transparent bg-bulb-yellow text-on-yellow",
        plus: "border-transparent bg-plus text-on-accent",
        business: "border-transparent bg-business text-on-accent",
        club: "border-transparent bg-club text-on-accent-warm",
        success: "border-transparent bg-success text-on-status",
        warning: "border-transparent bg-warning text-on-status",
        danger: "border-transparent bg-danger text-on-status",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90",
        outline:
          "border-border-strong text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
