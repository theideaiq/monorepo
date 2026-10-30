import { localized } from "@repo/commerce";
import { cn } from "@repo/design-system/lib/utils";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { Rail } from "@/components/shop/rail";
import { ShelfTabs } from "@/components/shop/shelf-tabs";
import { env } from "@/env";
import { type Category, getFormats, getProducts } from "@/lib/data";
import { appLink } from "@/lib/links";
import {
  gridFilters,
  STORE_PAGE_SIZE,
  type StoreQuery,
  storeQueryString,
} from "@/lib/store-params";
import { CatalogueGrid } from "./catalogue-grid";
import { CoverCard } from "./cover-card";

const ROW = 8;

/**
 * A top-level category's shelf (`/store/<category>`): its subcategory
 * chips, rows (New, Bestsellers, In Plus, Used deals), then "See all": the
 * grid with filters.
 */
export const CategoryShelf = async ({
  categories,
  category,
  locale,
  query,
}: {
  readonly categories: readonly Category[];
  readonly category: Category;
  readonly locale: Locale;
  readonly query: StoreQuery;
}) => {
  const t = await getTranslations({ locale, namespace: "web" });
  const subcategories = categories.filter(
    (row) => row.parent_id === category.id
  );
  const base = `/store/${category.slug}`;
  const sub = subcategories.find((row) => row.slug === query.sub);
  const slug = sub?.slug ?? category.slug;
  const browsing = query.page > 1;
  const [formats, all, fresh, featured, inPlus, preOwned] = await Promise.all([
    getFormats(),
    getProducts(gridFilters(query, category.slug)),
    browsing ? [] : getProducts({ category: slug, limit: ROW, sort: "newest" }),
    browsing ? [] : getProducts({ category: slug, featured: true, limit: ROW }),
    browsing ? [] : getProducts({ category: slug, kind: "rental", limit: ROW }),
    browsing ? [] : getProducts({ category: slug, limit: ROW, preOwned: true }),
  ]);
  const name = localized(sub ?? category, "name", locale);
  const seeAll = (changes: Partial<StoreQuery>) =>
    `${base}${storeQueryString({ page: 1, sort: "newest", sub: query.sub }, changes)}#all`;
  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-9 items-center rounded-full border px-4 text-sm transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "bg-card hover:bg-muted"
    );
  const rows = [
    { href: seeAll({}), items: fresh, key: "new", title: t("store.shelf.new") },
    {
      href: seeAll({}),
      items: featured,
      key: "featured",
      title: t("store.shelf.bestsellers"),
    },
    {
      href: seeAll({ plus: true }),
      items: inPlus,
      key: "plus",
      title: t("store.shelf.inPlus"),
    },
    {
      href: seeAll({}),
      items: preOwned,
      key: "used",
      title: t("store.shelf.usedDeals"),
    },
  ];

  return (
    <>
      <div className="container mx-auto flex flex-col gap-4 px-4 pt-4">
        <ShelfTabs
          active={category.slug}
          categories={categories}
          locale={locale}
        />
        <h1 className="font-bold text-2xl tracking-tight md:text-3xl">
          {name}
        </h1>
        {subcategories.length > 0 ? (
          <nav aria-label={t("store.subcategories")}>
            <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              <li className="shrink-0">
                <Link
                  aria-current={sub ? undefined : "page"}
                  className={chip(!sub)}
                  href={base}
                >
                  {t("store.allIn", {
                    category: localized(category, "name", locale),
                  })}
                </Link>
              </li>
              {subcategories.map((row) => (
                <li className="shrink-0" key={row.id}>
                  <Link
                    aria-current={row.slug === sub?.slug ? "page" : undefined}
                    className={chip(row.slug === sub?.slug)}
                    href={`${base}?sub=${encodeURIComponent(row.slug)}`}
                  >
                    {localized(row, "name", locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        {slug === "textbooks" ? (
          <p className="rounded-lg border bg-muted/40 p-4 text-sm">
            {t("store.sellTextbooks")}{" "}
            <a
              className="font-medium text-pink-text underline"
              href={appLink(env.NEXT_PUBLIC_APP_URL, locale, "/new", {
                for: "selling",
              })}
            >
              {t("store.sellTextbooksLink")}
            </a>
          </p>
        ) : null}
      </div>

      {rows.map((row) =>
        row.items.length > 0 ? (
          <Rail
            action={{ href: row.href, label: t("store.shelf.seeAll") }}
            key={row.key}
            title={row.title}
          >
            {row.items.map((product) => (
              <CoverCard key={product.id} product={product} />
            ))}
          </Rail>
        ) : null
      )}

      <CatalogueGrid
        basePath={base}
        formats={formats}
        hasNext={all.length > STORE_PAGE_SIZE}
        locale={locale}
        products={all.slice(0, STORE_PAGE_SIZE)}
        query={query}
        subcategories={subcategories}
        title={t("store.allIn", { category: name })}
      />
    </>
  );
};
