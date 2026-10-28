import { localized } from "@repo/commerce";
import type { BundleItem } from "@repo/commerce/catalog";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";

const HEADING = "bundle-contents";

/** What a shop's bundle holds, each item linking to its own page. */
export const BundleContents = async ({
  items,
  locale,
}: {
  readonly items: readonly BundleItem[];
  readonly locale: Locale;
}) => {
  if (items.length === 0) {
    return null;
  }
  const t = await getTranslations({ locale, namespace: "web.store.product" });
  return (
    <section aria-labelledby={HEADING} className="flex flex-col gap-3">
      <h2 className="font-semibold text-lg" id={HEADING}>
        {t("bundle")}
      </h2>
      <ul className="divide-y rounded-md border text-sm">
        {items.map((item) => {
          const label = localized(item, "label", locale);
          return (
            <li
              className="flex items-center gap-3 p-3"
              key={`${item.slug}-${label}`}
            >
              <span className="font-medium tabular-nums">
                {t("bundleQuantity", {
                  count: formatNumber(item.quantity, locale),
                })}
              </span>
              <Link
                className="underline-offset-4 hover:underline"
                href={`/store/${item.slug}`}
              >
                {localized(item, "name", locale)}
                {label ? ` · ${label}` : ""}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
