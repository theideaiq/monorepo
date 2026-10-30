import { formatPrice, localized } from "@repo/commerce";
import type { ProductCard } from "@repo/commerce/catalog";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { localePath } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { XIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/section";
import type { Category } from "@/lib/data";
import type { Availability } from "@/lib/plus";
import {
  activeFilterCount,
  PRICE_STEPS,
  type StoreQuery,
  storeQueryString,
  storeSorts,
} from "@/lib/store-params";
import { FilterSheet, SortMenu } from "./catalogue-controls";
import { CoverCard } from "./cover-card";

/** Formats with a name in the messages files; others show as stored. */
const NAMED_FORMATS = [
  "CD",
  "Vinyl",
  "Cassette",
  "CD+DVD",
  "DVD",
  "Blu-ray",
] as const;

interface CatalogueGridProps {
  /** Plus surfaces: availability on every cover, keyed by product id. */
  readonly availability?: Record<string, Availability>;
  /** Where the grid lives ("/store/games"); filters link back to it. */
  readonly basePath: string;
  readonly formats?: readonly string[];
  readonly hasNext: boolean;
  readonly id?: string;
  readonly locale: Locale;
  /** Offer the "In Plus" filter (not on Plus, where everything is). */
  readonly plusFilter?: boolean;
  readonly products: readonly ProductCard[];
  readonly query: StoreQuery;
  readonly subcategories?: readonly Category[];
  readonly title: string;
}

/**
 * "See all": a grid of cover cards with filters (a side panel on wide
 * screens, a "Filter (n)" sheet on phones), the active filters as chips
 * that remove themselves, and the sort at the end of the header.
 */
export const CatalogueGrid = async ({
  availability,
  basePath,
  formats = [],
  hasNext,
  id = "all",
  locale,
  plusFilter = true,
  products,
  query,
  subcategories = [],
  title,
}: CatalogueGridProps) => {
  const t = await getTranslations({ locale, namespace: "web.store" });
  const href = (changes: Partial<StoreQuery>) =>
    `${basePath}${storeQueryString(query, { page: 1, ...changes })}#${id}`;
  const formatName = (format: string) =>
    (NAMED_FORMATS as readonly string[]).includes(format)
      ? t(`formats.${format as (typeof NAMED_FORMATS)[number]}`)
      : format;
  const count = activeFilterCount(query);
  const sub = subcategories.find((category) => category.slug === query.sub);

  const chips = [
    sub
      ? {
          key: "sub",
          label: localized(sub, "name", locale),
          remove: href({ sub: undefined }),
        }
      : null,
    query.format
      ? {
          key: "format",
          label: formatName(query.format),
          remove: href({ format: undefined }),
        }
      : null,
    query.max
      ? {
          key: "max",
          label: t("filters.upTo", { price: formatPrice(query.max, locale) }),
          remove: href({ max: undefined }),
        }
      : null,
    query.stock
      ? {
          key: "stock",
          label: t("filters.inStock"),
          remove: href({ stock: undefined }),
        }
      : null,
    query.plus
      ? {
          key: "plus",
          label: t("filters.inPlus"),
          remove: href({ plus: undefined }),
        }
      : null,
  ].filter((chip) => chip !== null);

  const form = (prefix: string) => (
    <form
      action={`${localePath(locale, basePath)}#${id}`}
      className="grid gap-5 text-sm"
      method="get"
    >
      {query.q ? <input name="q" type="hidden" value={query.q} /> : null}
      {query.category ? (
        <input name="category" type="hidden" value={query.category} />
      ) : null}
      {query.sort === "newest" ? null : (
        <input name="sort" type="hidden" value={query.sort} />
      )}
      {subcategories.length > 0 ? (
        <fieldset className="grid gap-2">
          <legend className="mb-1 font-medium">{t("subcategories")}</legend>
          <label className="flex min-h-8 items-center gap-2">
            <input
              defaultChecked={!query.sub}
              name="sub"
              type="radio"
              value=""
            />
            {t("allCategories")}
          </label>
          {subcategories.map((category) => (
            <label
              className="flex min-h-8 items-center gap-2"
              key={`${prefix}-${category.id}`}
            >
              <input
                defaultChecked={query.sub === category.slug}
                name="sub"
                type="radio"
                value={category.slug}
              />
              {localized(category, "name", locale)}
            </label>
          ))}
        </fieldset>
      ) : null}
      {formats.length > 1 ? (
        <fieldset className="grid gap-2">
          <legend className="mb-1 font-medium">{t("formatsLabel")}</legend>
          <label className="flex min-h-8 items-center gap-2">
            <input
              defaultChecked={!query.format}
              name="format"
              type="radio"
              value=""
            />
            {t("allFormats")}
          </label>
          {formats.map((format) => (
            <label
              className="flex min-h-8 items-center gap-2"
              key={`${prefix}-${format}`}
            >
              <input
                defaultChecked={query.format === format}
                name="format"
                type="radio"
                value={format}
              />
              {formatName(format)}
            </label>
          ))}
        </fieldset>
      ) : null}
      <fieldset className="grid gap-2">
        <legend className="mb-1 font-medium">{t("filters.price")}</legend>
        <label className="flex min-h-8 items-center gap-2">
          <input defaultChecked={!query.max} name="max" type="radio" value="" />
          {t("filters.anyPrice")}
        </label>
        {PRICE_STEPS.map((step) => (
          <label
            className="flex min-h-8 items-center gap-2"
            key={`${prefix}-${step}`}
          >
            <input
              defaultChecked={query.max === step}
              name="max"
              type="radio"
              value={step}
            />
            <span className="font-mono">
              {t("filters.upTo", { price: formatPrice(step, locale) })}
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="sr-only">{t("filters.more")}</legend>
        <label className="flex min-h-8 items-center gap-2">
          <input
            defaultChecked={query.stock}
            name="stock"
            type="checkbox"
            value="1"
          />
          {t("filters.inStock")}
        </label>
        {plusFilter ? (
          <label className="flex min-h-8 items-center gap-2">
            <input
              defaultChecked={query.plus}
              name="plus"
              type="checkbox"
              value="1"
            />
            {t("filters.inPlus")}
          </label>
        ) : null}
      </fieldset>
      <Button type="submit" variant="outline">
        {t("filters.apply")}
      </Button>
    </form>
  );

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="container mx-auto flex scroll-mt-20 flex-col gap-4 px-4 py-6"
      id={id}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          className="font-bold text-xl tracking-tight md:text-2xl"
          id={`${id}-title`}
        >
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <FilterSheet
            label={
              count > 0
                ? t("filters.buttonCount", {
                    count: formatNumber(count, locale),
                  })
                : t("filters.button")
            }
            title={t("filters.title")}
          >
            {form("sheet")}
          </FilterSheet>
          <SortMenu
            current={query.sort}
            label={t("sortLabel")}
            options={storeSorts.map((sort) => ({
              href: href({ sort }),
              label: t(`sort.${sort}`),
              value: sort,
            }))}
          />
        </div>
      </div>
      {chips.length > 0 ? (
        <ul aria-label={t("filters.active")} className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={chip.key}>
              <Link
                aria-label={t("filters.remove", { filter: chip.label })}
                className="inline-flex min-h-9 items-center gap-1 rounded-full border bg-card px-3 text-sm hover:bg-muted"
                href={chip.remove}
              >
                {chip.label}
                <XIcon aria-hidden="true" className="size-3.5" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <aside aria-label={t("filters.title")} className="hidden lg:block">
          {form("panel")}
        </aside>
        <div>
          {products.length > 0 ? (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <li className="flex" key={product.id}>
                  <CoverCard
                    availability={availability?.[product.id] ?? null}
                    plus={availability !== undefined}
                    product={product}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>
              {t("empty")}{" "}
              {count > 0 ? (
                <Link
                  className="text-pink-text underline"
                  href={`${basePath}${storeQueryString({ page: 1, q: query.q, sort: query.sort })}#${id}`}
                >
                  {t("clear")}
                </Link>
              ) : null}
            </EmptyState>
          )}
          <Pagination
            hasNext={hasNext}
            hrefFor={(page) =>
              `${basePath}${storeQueryString(query, { page })}#${id}`
            }
            locale={locale}
            page={query.page}
          />
        </div>
      </div>
    </section>
  );
};
