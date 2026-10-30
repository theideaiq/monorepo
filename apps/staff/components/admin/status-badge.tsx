import { cn } from "@repo/design-system/lib/utils";
import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

export type Tone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "brand";

const tones: Record<Tone, string> = {
  brand: "bg-bulb-yellow/20 text-foreground border-bulb-yellow/60",
  danger: "bg-danger/10 text-foreground border-danger/40",
  info: "bg-surface-sunken text-foreground border-border-strong",
  neutral: "bg-muted text-muted-foreground border-border",
  success: "bg-success/10 text-foreground border-success/30",
  warning: "bg-warning/10 text-foreground border-warning/40",
};

// The word stays in the body colour (a tinted word on its own tint falls under
// 4.5:1 on a shaded table row); the icon carries the tone.
const toneIconColours: Partial<Record<Tone, string>> = {
  danger: "text-danger",
  success: "text-success",
  warning: "text-warning",
};

// Status colours always come with an icon and the word.
const toneIcons: Partial<Record<Tone, typeof CircleCheck>> = {
  danger: CircleAlert,
  success: CircleCheck,
  warning: TriangleAlert,
};

const statusTones: Record<string, Tone> = {
  accepted: "success",
  active: "success",
  archived: "neutral",
  booked: "warning",
  canceled: "neutral",
  cancelled: "neutral",
  churned: "neutral",
  customer: "info",
  delivered: "success",
  draft: "neutral",
  expired: "neutral",
  failed: "danger",
  incomplete: "warning",
  kept: "success",
  lead: "neutral",
  open: "warning",
  out: "info",
  overdue: "danger",
  paid: "success",
  past_due: "warning",
  pending: "warning",
  planned: "neutral",
  processing: "info",
  published: "success",
  refunded: "neutral",
  rejected: "danger",
  requested: "warning",
  resolved: "success",
  returned: "neutral",
  revisions_requested: "warning",
  scheduled: "info",
  sending: "info",
  sent: "success",
  shipped: "info",
  terminated: "neutral",
  under_review: "info",
  vip: "brand",
  withdrawn: "neutral",
};

/**
 * A coloured pill for a status; the label is already translated. Success,
 * warning and danger also show their icon.
 */
export const StatusBadge = ({
  children,
  className,
  status,
  tone,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly status?: string;
  readonly tone?: Tone;
}) => {
  const resolved = tone ?? statusTones[status ?? ""] ?? "neutral";
  const Icon = toneIcons[resolved];

  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 font-medium text-xs",
        tones[resolved],
        className
      )}
    >
      {Icon ? (
        <Icon
          aria-hidden="true"
          className={cn("size-3 shrink-0", toneIconColours[resolved])}
        />
      ) : null}
      {children}
    </span>
  );
};
