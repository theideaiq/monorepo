import { localized } from "@repo/commerce";
import { cn } from "@repo/design-system/lib/utils";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import type { Category } from "@/lib/data";

/** Which shelf is open: For you, a top-level category's slug, or Deals. */
export type Shelf = "deals" | "for-you" | (string & {});

/**
 * The Store's shelf tabs: For you (`/`), each top-level category
 * (`/store/<category>`) and Deals (`/store/deals`). Each is its own page.
 */
export const ShelfTabs = async ({
  active,
  categories,
  locale,
}: {
  readonly active: Shelf;
  readonly categories: readonly Category[];
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.store.shelf" });
  const tabs = [
    { href: "/", id: "for-you", label: t("forYou") },
    ...categories
      .filter((category) => !category.parent_id)
      .map((category) => ({
        href: `/store/${category.slug}`,
        id: category.slug,
        label: localized(category, "name", locale),
      })),
    { href: "/store/deals", id: "deals", label: t("deals") },
  ];
  return (
    <nav aria-label={t("tabs")}>
      <ul className="no-scrollbar -mx-4 flex snap-x gap-1 overflow-x-auto border-b px-4">
        {tabs.map((tab) => (
          <li className="shrink-0 snap-start" key={tab.id}>
            <Link
              aria-current={tab.id === active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center border-b-2 px-3 font-medium text-sm transition-colors",
                tab.id === active
                  ? "border-idea-pink text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              href={tab.href}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};
