import { formatPrice } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { PackageOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { productHref } from "@/components/store/product-card";
import { type Box, boxParts, isSlot, partName } from "@/lib/boxes";

/** What a box holds: its fixed products, then what staff pick for it. */
export const BoxContents = async ({
  box,
  locale,
}: {
  readonly box: Box | null;
  readonly locale: Locale;
}) => {
  if (!box) {
    return null;
  }
  const t = await getTranslations({
    locale,
    namespace: "web.store.product.box",
  });
  const parts = boxParts(box);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 font-semibold text-lg">
        <PackageOpen aria-hidden="true" className="size-5" />
        {t("inside")}
      </h2>
      <ul className="flex flex-col gap-1 text-sm">
        {parts.map((part) => (
          <li className="flex flex-wrap gap-1" key={part.id}>
            <span className="tabular-nums">
              {t("count", { count: formatNumber(part.quantity, locale) })}
            </span>
            {part.product ? (
              <Link
                className="font-medium hover:underline"
                href={productHref(part.product.slug)}
              >
                {partName(part, locale)}
              </Link>
            ) : (
              <span className="font-medium">
                {t("picked", { name: partName(part, locale) })}
              </span>
            )}
          </li>
        ))}
      </ul>
      {box.min_value > 0 && parts.some(isSlot) ? (
        <p className="text-muted-foreground text-sm">
          {t("worth", { value: formatPrice(box.min_value, locale) })}
        </p>
      ) : null}
    </section>
  );
};
