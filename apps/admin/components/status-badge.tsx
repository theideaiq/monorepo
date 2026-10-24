import { cn } from "@repo/design-system/lib/utils";
import type { ReactNode } from "react";

export type Tone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "brand";

const tones: Record<Tone, string> = {
  brand: "bg-brand/20 text-foreground border-brand/50",
  danger: "bg-destructive/10 text-destructive border-destructive/30",
  info: "bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-300",
  neutral: "bg-muted text-muted-foreground border-border",
  success:
    "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  warning:
    "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300",
};

const statusTones: Record<string, Tone> = {
  accepted: "success",
  active: "success",
  archived: "neutral",
  canceled: "neutral",
  cancelled: "neutral",
  churned: "neutral",
  customer: "info",
  delivered: "success",
  draft: "neutral",
  expired: "neutral",
  failed: "danger",
  hiring: "warning",
  incomplete: "warning",
  lead: "neutral",
  open: "warning",
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

/** A coloured pill for a status; the label is already translated. */
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
}) => (
  <span
    className={cn(
      "inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 font-medium text-xs",
      tones[tone ?? statusTones[status ?? ""] ?? "neutral"],
      className
    )}
  >
    {children}
  </span>
);
