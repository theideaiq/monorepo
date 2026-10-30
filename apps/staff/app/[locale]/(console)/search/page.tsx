import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  EmptyState,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { param, type SearchParams } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { searchStaff } from "@/lib/admin/search";
import { requireSection } from "@/lib/admin/session";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.search");
  return { title: t("title") };
};

/** Search across Staff, grouped by section (the command bar's too). */
const SearchPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { staff, supabase } = await requireSection("dashboard");
  const t = await getTranslations("admin.search");
  const locale = (await getLocale()) as Locale;
  const q = param(await searchParams, "q")
    .trim()
    .slice(0, 120);
  const groups = q ? await searchStaff(supabase, staff.role, locale, q) : [];

  return (
    <>
      <PageHeader
        description={q ? t("for", { query: q }) : t("hint")}
        title={t("title")}
      />
      <PageBody>
        {q && groups.length === 0 ? <EmptyState title={t("empty")} /> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <Panel key={group.id} title={group.title}>
              <ul className="divide-y text-sm">
                {group.hits.map((hit) => (
                  <li key={hit.id}>
                    <Link
                      className="flex items-center justify-between gap-3 py-2 hover:underline"
                      href={hit.href}
                    >
                      <span className="font-medium">{hit.label}</span>
                      {hit.detail ? (
                        <span className="truncate text-muted-foreground">
                          {hit.detail}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      </PageBody>
    </>
  );
};

export default SearchPage;
