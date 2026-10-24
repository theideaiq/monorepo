"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { useTranslations } from "next-intl";
import type { TicketStatus } from "@/lib/support-queries";

const VARIANTS: Record<
  TicketStatus,
  "default" | "destructive" | "outline" | "secondary"
> = {
  closed: "outline",
  // Waiting on the customer: draw their eye.
  open: "secondary",
  pending: "default",
  resolved: "outline",
};

export const TicketStatusBadge = ({
  status,
}: {
  readonly status: TicketStatus;
}) => {
  const t = useTranslations("store.ticketStatus");
  return <Badge variant={VARIANTS[status]}>{t(status)}</Badge>;
};
