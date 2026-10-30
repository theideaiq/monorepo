import { cn } from "@repo/design-system/lib/utils";
import { Star } from "lucide-react";
import { starFills } from "@/lib/reviews";

interface StarsProps {
  readonly className?: string;
  /** Accessible description, e.g. "Rated 4.5 out of 5". */
  readonly label: string;
  /** 0 to 5; fractions fill part of a star. */
  readonly value: number;
}

/**
 * Five stars filled up to `value`, filling from the reading start (right in
 * Arabic, left in English).
 */
export const Stars = ({ className, label, value }: StarsProps) => (
  <span
    aria-label={label}
    className={cn("inline-flex items-center gap-0.5", className)}
    role="img"
  >
    {starFills(value).map((fill, index) => (
      <span
        aria-hidden="true"
        className="relative inline-flex size-[1em]"
        // biome-ignore lint/suspicious/noArrayIndexKey: the five stars are fixed positions
        key={index}
      >
        <Star className="size-full text-muted-foreground/40" />
        {fill > 0 ? (
          <span
            className="absolute inset-y-0 start-0 overflow-hidden"
            style={{ width: `${fill * 100}%` }}
          >
            <Star className="size-[1em] max-w-none fill-bulb-yellow text-warning" />
          </span>
        ) : null}
      </span>
    ))}
  </span>
);
