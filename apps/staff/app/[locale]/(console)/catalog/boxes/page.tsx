import { localized } from "@repo/commerce";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  EmptyState,
  MaybeLink,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  boxPriceOk,
  boxPriceRange,
  boxValue,
  percentBelow,
} from "@/lib/admin/boxes";
import { formatters } from "@/lib/admin/format";
import { requireSection } from "@/lib/admin/session";
import { CatalogTabs } from "../_components/catalog-tabs";
import {
  AddPartForms,
  AddThemeForm,
  BoxSettingsForm,
  BoxStatusButton,
  RemovePartButton,
  ThemeToggle,
} from "./forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.catalog.tabs");
  return { title: t("boxes") };
};

const BOX_COLUMNS =
  "product_id, min_value, season, product:products (id, name_ar, name_en, price, status, stock_count), box_parts (id, quantity, format, position, variant_id, product:products (name_ar, name_en), variant:product_variants (price), category:product_categories (name_ar, name_en)), box_themes (id, name_ar, name_en, active, position)" as const;

type Supabase = Awaited<ReturnType<typeof requireSection>>["supabase"];

const loadBoxes = (supabase: Supabase) =>
  supabase
    .from("boxes")
    .select(BOX_COLUMNS)
    .order("season", { nullsFirst: true });

type BoxRow = NonNullable<
  Awaited<ReturnType<typeof loadBoxes>>["data"]
>[number];
type Translate = Awaited<
  ReturnType<typeof getTranslations<"admin.catalog.boxes">>
>;

const byPosition = <T extends { position: number }>(items: readonly T[]) =>
  [...items].sort((a, b) => a.position - b.position);

/** A part's name: the product, or the slot's format and category. */
const partName = (part: BoxRow["box_parts"][number], locale: string) => {
  if (part.product) {
    return localized(part.product, "name", locale);
  }
  const category = part.category
    ? localized(part.category, "name", locale)
    : "";
  return part.format ? `${part.format} · ${category}` : category;
};

/** The price against the parts: in range (10–15% below) or not. */
const PriceCheck = ({
  box,
  format,
  t,
}: {
  readonly box: BoxRow;
  readonly format: ReturnType<typeof formatters>;
  readonly t: Translate;
}) => {
  const price = box.product?.price ?? 0;
  const value = boxValue(box.box_parts, box.min_value);
  const range = boxPriceRange(value);
  const ok = boxPriceOk(price, value);
  return (
    <p className="text-sm">
      <StatusBadge tone={ok ? "success" : "warning"}>
        {t("below", { percent: String(percentBelow(price, value)) })}
      </StatusBadge>{" "}
      {t("priceCheck", {
        max: format.money(range.max),
        min: format.money(range.min),
        price: format.money(price),
        value: format.money(value),
      })}
    </p>
  );
};

/** One box: price check, parts, themes and settings. */
const BoxPanel = ({
  box,
  canWrite,
  categories,
  format,
  locale,
  t,
}: {
  readonly box: BoxRow;
  readonly canWrite: boolean;
  readonly categories: { label: string; value: string }[];
  readonly format: ReturnType<typeof formatters>;
  readonly locale: string;
  readonly t: Translate;
}) => {
  const live = box.product?.status === "active";
  return (
    <Panel
      actions={
        canWrite ? <BoxStatusButton id={box.product_id} live={live} /> : null
      }
      description={t("stock", {
        count: String(box.product?.stock_count ?? 0),
      })}
      title={
        <MaybeLink href={`/catalog/products/${box.product_id}`}>
          {box.product ? localized(box.product, "name", locale) : ""}
        </MaybeLink>
      }
    >
      <PriceCheck box={box} format={format} t={t} />
      <div className="grid gap-1">
        <p className="font-medium text-sm">{t("parts")}</p>
        {box.box_parts.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noParts")}</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {byPosition(box.box_parts).map((part) => (
              <li
                className="flex items-center justify-between gap-2"
                key={part.id}
              >
                <span>
                  {t("part", {
                    count: String(part.quantity),
                    name: partName(part, locale),
                  })}
                  {part.variant_id ? null : (
                    <span className="text-muted-foreground">
                      {" "}
                      · {t("picked")}
                    </span>
                  )}
                </span>
                {canWrite ? <RemovePartButton id={part.id} /> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      {canWrite ? (
        <AddPartForms box={box.product_id} categories={categories} />
      ) : null}
      <div className="grid gap-1">
        <p className="font-medium text-sm">{t("themes")}</p>
        <ul className="grid gap-1 text-sm">
          {byPosition(box.box_themes).map((theme) => (
            <li
              className="flex items-center justify-between gap-2"
              key={theme.id}
            >
              <span
                className={
                  theme.active ? "" : "text-muted-foreground line-through"
                }
              >
                {localized(theme, "name", locale)}
              </span>
              {canWrite ? (
                <ThemeToggle active={theme.active} id={theme.id} />
              ) : null}
            </li>
          ))}
        </ul>
        {canWrite ? <AddThemeForm box={box.product_id} /> : null}
      </div>
      {canWrite ? (
        <BoxSettingsForm
          box={{
            minValue: box.min_value,
            productId: box.product_id,
            season: box.season,
          }}
        />
      ) : null}
    </Panel>
  );
};

/**
 * Boxes: Store products built from parts, sold until their parts run out
 * (no new boxes are made). Each lists its fixed products and the slots
 * staff fill when packing, the themes customers pick, and its price against
 * the parts (10–15% below to go on sale).
 */
const BoxesPage = async () => {
  const { canWrite, supabase } = await requireSection("catalog");
  const locale = await getLocale();
  const t = await getTranslations("admin.catalog.boxes");
  const tCatalog = await getTranslations("admin.catalog");
  const format = formatters(locale);

  const [{ data: boxes }, { data: categories }] = await Promise.all([
    loadBoxes(supabase),
    supabase
      .from("product_categories")
      .select("id, name_ar, name_en")
      .order("position"),
  ]);
  const categoryOptions = (categories ?? []).map((category) => ({
    label: localized(category, "name", locale),
    value: category.id,
  }));

  return (
    <>
      <PageHeader description={t("description")} title={tCatalog("title")} />
      <CatalogTabs />
      <PageBody>
        {(boxes ?? []).length === 0 ? <EmptyState title={t("empty")} /> : null}
        {(boxes ?? []).map((box) => (
          <BoxPanel
            box={box}
            canWrite={canWrite}
            categories={categoryOptions}
            format={format}
            key={box.product_id}
            locale={locale}
            t={t}
          />
        ))}
      </PageBody>
    </>
  );
};

export default BoxesPage;
