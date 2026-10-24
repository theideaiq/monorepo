import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface HighlightProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * The Highlight: one or two headline words on a yellow swipe with dark
 * text. Inside a pink ground (PinkBand) the words simply turn yellow, with
 * no swipe. One per headline.
 */
export const Highlight = ({ children, className }: HighlightProps) => (
  <mark
    className={cn(
      "rounded-[0.18em] bg-bulb-yellow box-decoration-clone px-[0.14em] text-on-yellow",
      "group-data-[ground=pink]/ground:bg-transparent group-data-[ground=pink]/ground:px-0 group-data-[ground=pink]/ground:text-bulb-yellow",
      className
    )}
    data-slot="highlight"
  >
    {children}
  </mark>
);
