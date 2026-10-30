"use client";

import { cn } from "@repo/design-system/lib/utils";
import {
  CalendarClockIcon,
  CircleCheckIcon,
  ClockIcon,
  HourglassIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { PlusAvailability } from "@/lib/plus-availability";

const ICONS: Record<PlusAvailability, LucideIcon> = {
  coming: CalendarClockIcon,
  long: HourglassIcon,
  now: CircleCheckIcon,
  short: ClockIcon,
};

/** Plus availability in words, with its icon: "Available now", "Short wait". */
export const AvailabilityLabel = ({
  availability,
  className,
}: {
  readonly availability: PlusAvailability | null | undefined;
  readonly className?: string;
}) => {
  const t = useTranslations("app.pass.availability");
  if (!availability) {
    return null;
  }
  const Icon = ICONS[availability];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        availability === "now" ? "text-success" : "text-muted-foreground",
        className
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {t(availability)}
    </span>
  );
};
