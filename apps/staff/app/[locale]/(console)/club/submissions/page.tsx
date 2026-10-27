import type { SubmissionStatus } from "@repo/database";
import { cn } from "@repo/design-system/lib/utils";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/admin/page";
import { SectionTabs } from "@/components/admin/section-tabs";
import { formatters } from "@/lib/admin/format";
import { oneOf, type SearchParams } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import { EditorialTabs } from "../_components/editorial-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.editorial.tabs");
  return { title: t("submissions") };
};

const columns: SubmissionStatus[] = [
  "pending",
  "under_review",
  "revisions_requested",
  "accepted",
  "rejected",
];

/**
 * The editorial board, from `review_queue()`: authors stay hidden until a
 * decision is made (blind review).
 */
const SubmissionsPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { staff, supabase } = await requireSection("editorial");
  const params = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin.editorial.submissions");
  const tEditorial = await getTranslations("admin.editorial");
  const tStore = await getTranslations("store");
  const format = formatters(locale);
  const mine = oneOf(params, "view", ["mine"] as const) === "mine";

  const { data, error } = await supabase.rpc("review_queue");
  const rows = (data ?? []).filter(
    (row) => !mine || row.assigned_to === staff.userId
  );
  const editors = await profileNames(
    supabase,
    rows.map((row) => row.assigned_to)
  );

  return (
    <>
      <PageHeader title={tEditorial("title")} />
      <EditorialTabs />
      <SectionTabs
        tabs={[
          { active: !mine, href: "/club/submissions", label: t("all") },
          {
            active: mine,
            href: "/club/submissions?view=mine",
            label: t("mine"),
          },
        ]}
      />
      <PageBody>
        {error ? (
          <p className="text-destructive text-sm">{t("error")}</p>
        ) : null}
        <p className="text-muted-foreground text-sm">{t("blindHint")}</p>
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="grid min-w-[64rem] grid-cols-5 gap-3">
            {columns.map((status) => {
              const items = rows.filter((row) => row.status === status);
              return (
                <section
                  className="flex flex-col gap-2 rounded-lg bg-muted/50 p-2"
                  key={status}
                >
                  <h2 className="flex items-center justify-between px-1 font-medium text-sm">
                    {tStore(`submissionStatus.${status}`)}
                    <span className="rounded-full bg-background px-2 text-muted-foreground text-xs tabular-nums">
                      {format.number(items.length)}
                    </span>
                  </h2>
                  {items.length === 0 ? (
                    <p className="px-1 py-4 text-center text-muted-foreground text-xs">
                      {t("emptyColumn")}
                    </p>
                  ) : null}
                  {items.map((row) => (
                    <Link
                      className={cn(
                        "grid gap-1 rounded-md border bg-card p-3 text-card-foreground text-sm shadow-xs transition-colors hover:border-primary/50",
                        row.assigned_to === staff.userId && "border-primary/40"
                      )}
                      href={`/club/submissions/${row.id}`}
                      key={row.id}
                    >
                      <span className="line-clamp-2 font-medium" dir="auto">
                        {row.title}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {tStore(`submissionType.${row.type}`)} ·{" "}
                        {format.date(row.submitted_at)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {row.assigned_to
                          ? t("assignedTo", {
                              name:
                                editors.get(row.assigned_to) ??
                                t("unnamedEditor"),
                            })
                          : t("unassigned")}
                      </span>
                      {row.author_name ? (
                        <span className="text-xs">
                          {t("author", { name: row.author_name })}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </section>
              );
            })}
          </div>
        </div>
      </PageBody>
    </>
  );
};

export default SubmissionsPage;
