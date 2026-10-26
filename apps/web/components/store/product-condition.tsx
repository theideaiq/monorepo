"use client";

import { showsCondition } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { cn } from "@repo/design-system/lib/utils";
import { useTranslations } from "next-intl";

interface ProductConditionProps {
  readonly className?: string;
  readonly product: Parameters<typeof showsCondition>[0];
}

/** The condition (Open box, Refurbished, Used) of items for sale that aren't new. */
export const ProductCondition = ({
  className,
  product,
}: ProductConditionProps) => {
  const t = useTranslations("store.condition");
  if (!showsCondition(product)) {
    return null;
  }
  return (
    <Badge className={cn("self-start", className)} variant="outline">
      {t(product.condition)}
    </Badge>
  );
};
