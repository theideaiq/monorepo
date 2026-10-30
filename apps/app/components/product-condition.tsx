import { showsCondition } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import type { Locale } from "@repo/internationalization";
import { getTranslations } from "next-intl/server";

interface ProductConditionProps {
  readonly locale: Locale;
  readonly product: Parameters<typeof showsCondition>[0];
}

/** The condition (Open box, Refurbished, Used) of items for sale that aren't new. */
export const ProductCondition = async ({
  locale,
  product,
}: ProductConditionProps) => {
  if (!showsCondition(product)) {
    return null;
  }
  const t = await getTranslations({ locale, namespace: "store.condition" });
  return (
    <Badge className="self-start" variant="outline">
      {t(product.condition)}
    </Badge>
  );
};
