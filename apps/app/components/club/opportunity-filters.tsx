import { Constants } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { localePath } from "@repo/internationalization";
import { formatNumber, intlLocale } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { countryName, joinPath, type OpportunityFilters } from "@/lib/club";
import type { OpportunityRow } from "@/lib/data";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs";

const Filter = ({
  children,
  htmlFor,
  label,
}: {
  readonly children: ReactNode;
  readonly htmlFor: string;
  readonly label: string;
}) => (
  <div className="grid gap-2">
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
  </div>
);

/**
 * The filters of `/club/opportunities`: a plain GET form, with destinations
 * from what's listed now and every other choice from the database's lists.
 */
export const OpportunityFiltersForm = async ({
  filters,
  locale,
  opportunities,
}: {
  readonly filters: OpportunityFilters;
  readonly locale: Locale;
  readonly opportunities: readonly OpportunityRow[];
}) => {
  const t = await getTranslations({ locale, namespace: "web.opportunities" });
  const { Enums: values } = Constants.public;
  const language = intlLocale(locale);
  const countries = [
    ...new Set(opportunities.flatMap((row) => row.destination_countries ?? [])),
  ]
    .map((code) => ({ code, name: countryName(code, language) }))
    .sort((a, b) => a.name.localeCompare(b.name, language));
  const select = (
    name: string,
    label: string,
    current: string | null,
    options: readonly { label: string; value: string }[]
  ) => (
    <Filter htmlFor={`filter-${name}`} label={label}>
      <select
        className={selectClassName}
        defaultValue={current ?? ""}
        id={`filter-${name}`}
        name={name}
      >
        <option value="">{t("filters.any")}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Filter>
  );

  return (
    <form
      action={localePath(locale, joinPath("opportunities"))}
      aria-label={t("filters.label")}
      className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-3"
      method="get"
    >
      {select(
        "kind",
        t("filters.kind"),
        filters.kind,
        values.opportunity_kind.map((value) => ({
          label: t(`kinds.${value}`),
          value,
        }))
      )}
      {select(
        "level",
        t("filters.level"),
        filters.level,
        values.opportunity_level.map((value) => ({
          label: t(`levelNames.${value}`),
          value,
        }))
      )}
      {select(
        "country",
        t("filters.country"),
        filters.country,
        countries.map(({ code, name }) => ({ label: name, value: code }))
      )}
      {select(
        "funding",
        t("filters.funding"),
        filters.funding,
        values.opportunity_funding
          .filter((value) => value !== "unknown")
          .map((value) => ({
            label: t(`fundingTypes.${value}`),
            value,
          }))
      )}
      {select(
        "eligibility",
        t("filters.eligibility"),
        filters.eligibility,
        values.opportunity_eligibility.map((value) => ({
          label: t(`eligibilityGrades.${value}`),
          value,
        }))
      )}
      <Filter htmlFor="filter-age" label={t("filters.age")}>
        <Input
          defaultValue={filters.age ?? ""}
          dir="ltr"
          id="filter-age"
          inputMode="numeric"
          max={99}
          min={1}
          name="age"
          type="number"
        />
      </Filter>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
        <Button size="sm" type="submit">
          {t("filters.apply")}
        </Button>
        <Link
          className="text-muted-foreground text-sm underline"
          href={joinPath("opportunities")}
        >
          {t("filters.clear")}
        </Link>
      </div>
    </form>
  );
};

/**
 * C19: the destinations listed now, as chips with how many opportunities
 * go there (most first), each opening the list filtered to that country.
 */
export const OpportunitiesByCountry = async ({
  locale,
  opportunities,
}: {
  readonly locale: Locale;
  readonly opportunities: readonly OpportunityRow[];
}) => {
  const t = await getTranslations({ locale, namespace: "web.opportunities" });
  const language = intlLocale(locale);
  const counts = new Map<string, number>();
  for (const row of opportunities) {
    for (const code of new Set(row.destination_countries ?? [])) {
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }
  const countries = [...counts]
    .map(([code, count]) => ({
      code,
      count,
      name: countryName(code, language),
    }))
    .sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, language)
    );
  return countries.length > 1 ? (
    <nav aria-label={t("byCountry")} className="grid gap-2">
      <h2 className="font-semibold text-sm">{t("byCountry")}</h2>
      <ul className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {countries.map(({ code, count, name }) => (
          <li className="shrink-0 snap-start" key={code}>
            <Link
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              href={`${joinPath("opportunities")}?country=${code}`}
            >
              {name}
              <span className="text-muted-foreground text-xs">
                {formatNumber(count, locale)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  ) : null;
};
