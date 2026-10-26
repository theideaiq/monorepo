import { cn } from "@repo/design-system/lib/utils";
import { getTranslations } from "next-intl/server";
import { type Scenario, scenarios } from "@/lib/admin/finance";
import { type SearchParams, withParams } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";

/**
 * Actual · Forecast · Budget. Keeps the page's other filters; the actual
 * books are the default, so they drop the parameter.
 */
export const ScenarioSwitcher = async ({
  current,
  params,
  pathname,
}: {
  readonly current: Scenario;
  readonly params: SearchParams;
  readonly pathname: string;
}) => {
  const t = await getTranslations("admin.finance");

  return (
    <nav
      aria-label={t("scenario")}
      className="inline-flex w-fit rounded-md border bg-muted/40 p-0.5 text-sm"
    >
      {scenarios.map((scenario) => (
        <Link
          aria-current={scenario === current ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium transition-colors",
            scenario === current
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
          href={`${pathname}${withParams(params, {
            page: null,
            scenario: scenario === "actual" ? null : scenario,
          })}`}
          key={scenario}
        >
          {t(`scenarios.${scenario}`)}
        </Link>
      ))}
    </nav>
  );
};
