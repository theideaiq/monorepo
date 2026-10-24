"use client";

import type { OrderStatus } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { useTranslations } from "next-intl";

const VARIANTS: Record<
  OrderStatus,
  "default" | "destructive" | "outline" | "secondary"
> = {
  cancelled: "outline",
  confirmed: "default",
  delivered: "secondary",
  paid: "default",
  pending: "outline",
  processing: "default",
  refunded: "outline",
  shipped: "default",
};

export const OrderStatusBadge = ({
  status,
}: {
  readonly status: OrderStatus;
}) => {
  const t = useTranslations("store.orderStatus");
  return <Badge variant={VARIANTS[status]}>{t(status)}</Badge>;
};
