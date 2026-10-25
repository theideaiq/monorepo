import { customerCondition, showsConditionBulb } from "@repo/commerce";
import { ConditionBulb } from "@repo/design-system/components/brand/condition-bulb";
import type { Locale } from "@repo/internationalization";
import { getTranslations } from "next-intl/server";

interface ProductConditionBulbProps {
  readonly locale: Locale;
  readonly product: Parameters<typeof showsConditionBulb>[0];
}

/** The condition bulb and its word, for items for sale that aren't new. */
export const ProductConditionBulb = async ({
  locale,
  product,
}: ProductConditionBulbProps) => {
  if (!showsConditionBulb(product)) {
    return null;
  }
  const t = await getTranslations({ locale, namespace: "store.conditionBulb" });
  const condition = customerCondition(product.condition);
  return <ConditionBulb condition={condition} label={t(condition)} />;
};
