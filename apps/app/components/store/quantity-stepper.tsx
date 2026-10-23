"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { formatNumber } from "@repo/internationalization/format";
import { MinusIcon, PlusIcon } from "lucide-react";
import { useLocale } from "next-intl";

interface QuantityStepperProps {
  readonly decreaseLabel: string;
  readonly disabled?: boolean;
  readonly increaseLabel: string;
  readonly label: string;
  readonly max: number;
  readonly min?: number;
  readonly onChange: (quantity: number) => void;
  readonly value: number;
}

/** − 2 + */
export const QuantityStepper = ({
  decreaseLabel,
  disabled,
  increaseLabel,
  label,
  max,
  min = 1,
  onChange,
  value,
}: QuantityStepperProps) => {
  const locale = useLocale();

  return (
    <fieldset
      aria-label={label}
      className="inline-flex items-center rounded-md border"
      disabled={disabled}
    >
      <Button
        aria-label={decreaseLabel}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <MinusIcon />
      </Button>
      <output
        aria-live="polite"
        className="w-8 text-center text-sm tabular-nums"
      >
        {formatNumber(value, locale)}
      </output>
      <Button
        aria-label={increaseLabel}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <PlusIcon />
      </Button>
    </fieldset>
  );
};
