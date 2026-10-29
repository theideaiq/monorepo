import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import type { Category } from "@/lib/data";

/**
 * A sideways row of top-level categories, each opening the catalog
 * filtered (with its subcategories).
 */
export const CategoryChips = ({
  categories,
  hrefFor,
  label,
  locale,
}: {
  readonly categories: Category[];
  readonly hrefFor: (slug: string) => string;
  readonly label: string;
  readonly locale: Locale;
}) => {
  const topLevel = categories.filter((category) => !category.parent_id);
  return topLevel.length > 0 ? (
    <nav aria-label={label}>
      <ul className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4">
        {topLevel.map((category) => (
          <li className="shrink-0 snap-start" key={category.id}>
            <Link
              className="block rounded-full border bg-card px-4 py-2 text-sm transition-colors hover:bg-muted"
              href={hrefFor(category.slug)}
            >
              {localized(category, "name", locale)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  ) : null;
};
