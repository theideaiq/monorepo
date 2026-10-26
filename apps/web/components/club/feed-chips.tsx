import { cn } from "@repo/design-system/lib/utils";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { type ClubFilter, clubFilters, clubPath, filterPath } from "@/lib/club";

/** The Club feed's chips: everything, then Events, News, Stories, Guides. */
export const FeedChips = async ({
  current,
  locale,
}: {
  readonly current?: ClubFilter;
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.club" });
  const chips = [
    { active: !current, href: clubPath, label: t("chips.all") },
    ...clubFilters.map((filter) => ({
      active: current === filter,
      href: filterPath(filter),
      label: t(`chips.${filter}`),
    })),
  ];
  return (
    <nav aria-label={t("chips.label")} className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2">
        {chips.map((chip) => (
          <li className="shrink-0" key={chip.href}>
            <Link
              aria-current={chip.active ? "page" : undefined}
              className={cn(
                "inline-flex rounded-full border px-4 py-1.5 font-medium text-sm transition-colors hover:bg-muted",
                chip.active &&
                  "border-primary bg-primary text-primary-foreground hover:bg-primary"
              )}
              href={chip.href}
            >
              {chip.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};
