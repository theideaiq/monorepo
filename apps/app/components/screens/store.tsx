"use client";

import { localized } from "@repo/commerce";
import type { ProductFilters } from "@repo/commerce/catalog";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@repo/design-system/components/ui/empty";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { cn } from "@repo/design-system/lib/utils";
import { useRouter } from "@repo/internationalization/navigation";
import { SearchIcon, ShoppingBagIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { ProductCard } from "@/components/store/product-card";
import { useProductRatings } from "@/lib/review-queries";
import { useCategories, useProducts } from "@/lib/store-queries";

const PAGE_SIZE = 24;
const SORTS = ["newest", "price-asc", "price-desc"] as const;
type Sort = (typeof SORTS)[number];
const SORT_LABELS = {
  newest: "newest",
  "price-asc": "priceAsc",
  "price-desc": "priceDesc",
} as const;

const isSort = (value: string | null): value is Sort =>
  SORTS.includes(value as Sort);

/** The store catalog: categories, search and sorting, kept in the URL. */
export const Store = () => {
  const t = useTranslations("app.store");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const category = params.get("category") ?? "";
  const sortParam = params.get("sort");
  const sort: Sort = isSort(sortParam) ? sortParam : "newest";
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [draft, setDraft] = useState(query);
  const [shownQuery, setShownQuery] = useState(query);
  // A search from the header: show it in the field too.
  if (shownQuery !== query) {
    setShownQuery(query);
    setDraft(query);
  }

  const categories = useCategories("sale");
  const filters: ProductFilters = {
    category: category || undefined,
    kind: "sale",
    limit,
    search: query || undefined,
    sort,
  };
  const products = useProducts(filters);
  const ratings = useProductRatings(
    products.data?.map((product) => product.id) ?? []
  );

  const navigate = (
    next: Partial<Record<"category" | "q" | "sort", string>>
  ) => {
    const merged = { category, q: query, sort, ...next };
    const search: Record<string, string> = {};
    for (const [key, value] of Object.entries(merged)) {
      if (value && !(key === "sort" && value === "newest")) {
        search[key] = value;
      }
    }
    setLimit(PAGE_SIZE);
    router.replace({ pathname: "/store", query: search });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate({ q: draft.trim() });
  };

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "hover:bg-accent"
    );

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <p className="text-muted-foreground">{t("description")}</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <search className="flex-1">
            <form className="relative" onSubmit={submit}>
              <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label={t("search")}
                className="ps-9"
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t("search")}
                type="search"
                value={draft}
              />
            </form>
          </search>
          <Select
            onValueChange={(value) => navigate({ sort: value })}
            value={sort}
          >
            <SelectTrigger aria-label={t("sort.label")} className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`sort.${SORT_LABELS[option]}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {categories.data?.length ? (
          <nav
            aria-label={t("categories")}
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
          >
            <button
              aria-pressed={!category}
              className={chip(!category)}
              onClick={() => navigate({ category: "" })}
              type="button"
            >
              {t("allCategories")}
            </button>
            {categories.data.map((item) => (
              <button
                aria-pressed={category === item.slug}
                className={chip(category === item.slug)}
                key={item.id}
                onClick={() => navigate({ category: item.slug })}
                type="button"
              >
                {localized(item, "name", locale)}
              </button>
            ))}
          </nav>
        ) : null}

        {query ? (
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-lg">
              {t("resultsFor", { query })}
            </h2>
            <Button
              onClick={() => {
                setDraft("");
                navigate({ q: "" });
              }}
              size="sm"
              variant="ghost"
            >
              {t("clearSearch")}
            </Button>
          </div>
        ) : null}

        {products.isPending ? <SectionSpinner /> : null}
        {products.isError ? (
          <ErrorState onRetry={() => products.refetch()} />
        ) : null}
        {products.data?.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShoppingBagIcon />
              </EmptyMedia>
              <EmptyDescription>
                {query ? t("emptySearch", { query }) : t("empty")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        {products.data?.length ? (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.data.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                rating={ratings.data?.get(product.id)}
              />
            ))}
          </ul>
        ) : null}
        {products.data && products.data.length >= limit ? (
          <Button
            className="self-center"
            disabled={products.isFetching}
            onClick={() => setLimit((current) => current + PAGE_SIZE)}
            variant="outline"
          >
            {t("loadMore")}
          </Button>
        ) : null}
      </div>
    </>
  );
};
