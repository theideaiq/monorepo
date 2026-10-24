"use client";

import { customerCondition, showsConditionBulb } from "@repo/commerce";
import { ConditionBulb } from "@repo/design-system/components/brand/condition-bulb";
import { useTranslations } from "next-intl";

interface ProductConditionBulbProps {
  readonly className?: string;
  readonly product: Parameters<typeof showsConditionBulb>[0];
}

/** The condition bulb and its word, for rentals and anything not new. */
export const ProductConditionBulb = ({
  className,
  product,
}: ProductConditionBulbProps) => {
  const t = useTranslations("store.conditionBulb");
  if (!showsConditionBulb(product)) {
    return null;
  }
  const condition = customerCondition(product.condition);
  return (
    <ConditionBulb
      className={className}
      condition={condition}
      label={t(condition)}
    />
  );
};
