import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { ProductImage } from "@/components/store/product-image";
import { type Category, getProducts } from "@/lib/data";

/**
 * One real cover for a category: a featured product's, else the newest
 * one's. Every listed product has a picture, so an empty category is the
 * only one without.
 */
const coverFor = async (slug: string) => {
  const [featured] = await getProducts({
    category: slug,
    featured: true,
    limit: 1,
  });
  const product =
    featured ??
    (await getProducts({ category: slug, limit: 1, sort: "newest" }))[0];
  return product?.images[0] ?? null;
};

/**
 * The Store's top-level categories as pictures (C8): each tile shows a
 * cover from that category and opens its shelf (`/store/<category>`).
 * Categories with nothing listed are left out.
 */
export const CategoryTiles = async ({
  categories,
  locale,
}: {
  readonly categories: readonly Category[];
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.store.shelf" });
  const topLevel = categories.filter((category) => !category.parent_id);
  const covers = await Promise.all(
    topLevel.map((category) => coverFor(category.slug))
  );
  const tiles = topLevel
    .map((category, index) => ({ category, cover: covers[index] }))
    .filter((tile) => tile.cover);
  return tiles.length > 0 ? (
    <nav aria-label={t("categories")}>
      <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-6 md:px-0">
        {tiles.map(({ category, cover }) => {
          const name = localized(category, "name", locale);
          return (
            <li
              className="w-24 shrink-0 snap-start md:w-auto"
              key={category.id}
            >
              <Link
                className="group grid gap-1.5 rounded-lg text-center"
                href={`/store/${category.slug}`}
              >
                <ProductImage
                  alt=""
                  className="transition-transform group-hover:scale-[1.03]"
                  path={cover}
                  sizes="(min-width: 768px) 16vw, 96px"
                />
                <span className="font-medium text-sm">{name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  ) : null;
};
