import { Bulb } from "@repo/design-system/components/brand/bulb";
import { cn } from "@repo/design-system/lib/utils";

/**
 * The brand's bulb as a fill meter: an empty bulb, and the same bulb in
 * yellow shown from the bottom up to `share` (0–1). The bulb itself is
 * never redrawn, only cropped.
 */
export const BulbMeter = ({
  className,
  label,
  share,
}: {
  readonly className?: string;
  /** What the meter says, read out instead of the picture. */
  readonly label: string;
  readonly share: number;
}) => {
  const percent = Math.round(Math.min(1, Math.max(0, share)) * 100);
  return (
    <div className={cn("relative aspect-square shrink-0", className)}>
      <meter
        aria-label={label}
        className="sr-only"
        max={100}
        min={0}
        value={percent}
      >
        {label}
      </meter>
      <Bulb className="absolute inset-0 size-full text-bulb-empty" />
      <div
        className="absolute inset-x-0 bottom-0 overflow-hidden motion-safe:transition-[height] motion-safe:duration-300 motion-safe:ease-switch-on"
        style={{ height: `${percent}%` }}
      >
        <Bulb className="absolute inset-x-0 bottom-0 aspect-square w-full text-bulb-yellow" />
      </div>
    </div>
  );
};
