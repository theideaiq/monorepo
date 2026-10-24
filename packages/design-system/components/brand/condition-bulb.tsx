import { useId } from "react";
import { cn } from "../../lib/utils";
import { BULB_PATH } from "./bulb";

/** The three conditions customers see; letter grades stay internal. */
export type Condition = "like-new" | "new" | "used";

/**
 * Maps a stock grade to the customer-facing condition: sealed → new,
 * A → like new, B or C → used. Retired items (X) and unknown grades are
 * never shown to customers (null).
 */
export const conditionFromGrade = (grade: string): Condition | null => {
  switch (grade.trim().toUpperCase()) {
    case "SEALED":
      return "new";
    case "A":
      return "like-new";
    case "B":
    case "C":
      return "used";
    default:
      return null;
  }
};

interface ConditionBulbProps {
  readonly className?: string;
  readonly condition: Condition;
  /** The word beside the bulb (جديد / New, اخو الجديد / Like new, مستعمل / Used). */
  readonly label: string;
}

/**
 * A condition bulb with its word: full yellow for new, unlit for like new,
 * the bottom half lit for used. Always shown with the word.
 */
export const ConditionBulb = ({
  className,
  condition,
  label,
}: ConditionBulbProps) => {
  const clip = useId();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium text-small",
        className
      )}
      data-condition={condition}
      data-slot="condition-bulb"
    >
      <svg
        aria-hidden="true"
        className="size-5 shrink-0"
        fill="none"
        viewBox="0 0 509 510"
        xmlns="http://www.w3.org/2000/svg"
      >
        {condition === "used" ? (
          <defs>
            <clipPath id={clip}>
              <rect height="242" width="509" x="0" y="0" />
            </clipPath>
          </defs>
        ) : null}
        <path
          className={
            condition === "like-new" ? "fill-bulb-empty" : "fill-bulb-yellow"
          }
          d={BULB_PATH}
        />
        {condition === "used" ? (
          <path
            className="fill-bulb-empty"
            clipPath={`url(#${clip})`}
            d={BULB_PATH}
          />
        ) : null}
      </svg>
      {label}
    </span>
  );
};
