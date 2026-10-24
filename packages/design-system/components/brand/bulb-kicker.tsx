import { cn } from "../../lib/utils";
import { Bulb } from "./bulb";

const sizes = { lg: "size-7", md: "size-6", sm: "size-5" } as const;

interface BulbKickerProps {
  readonly className?: string;
  /** 20, 24 or 28px. */
  readonly size?: keyof typeof sizes;
}

/**
 * The bulb kicker: a small bulb centred above a headline. Pink on Paper,
 * yellow in dark mode and on pink grounds (PinkBand); on yellow grounds
 * add `className="text-idea-pink"`.
 */
export const BulbKicker = ({ className, size = "md" }: BulbKickerProps) => (
  <Bulb
    className={cn(
      "mx-auto block shrink-0 text-idea-pink group-data-[ground=pink]/ground:text-bulb-yellow dark:text-bulb-yellow",
      sizes[size],
      className
    )}
    data-slot="bulb-kicker"
  />
);
