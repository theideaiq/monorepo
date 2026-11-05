import { localized } from "@repo/commerce";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { Link } from "@/lib/admin/navigation";
import { requireSection } from "@/lib/admin/session";
import { EditorialTabs } from "../../_components/editorial-tabs";
import { markDraftChecked, publishDraft } from "../../actions";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.editorial.drafts");
  return { title: t("title") };
};

const COLUMNS =
  "id, title_ar, title_en, host_name, deadline, source_url, last_checked_on, created_at" as const;

/**
 * R4: every opportunity still a draft (the imported outside programs among
 * them), oldest check first, with both titles side by side for the Arabic
 * read, the source to verify against and when it was last checked. An
 * editor publishes one as it stands, records a check, or opens it to edit.
 * Nothing is deleted from here.
 */
const DraftsPage = async () => {
  const { canWrite, supabase } = await requireSection("editorial");
  const locale = await getLocale();
  const t = await getTranslations("admin.editorial.drafts");
  const format = formatters(locale);
  const { data: drafts } = await supabase
    .from("opportunities")
    .select(COLUMNS)
    .eq("status", "draft")
    .order("last_checked_on", { ascending: true, nullsFirst: true })
    .order("created_at")
    .limit(200);

  return (
    <>
      <PageHeader description={t("description")} title={t("title")} />
      <EditorialTabs />
      <PageBody>
        {(drafts ?? []).length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("titleEn")}</TableHead>
                  <TableHead>{t("titleAr")}</TableHead>
                  <TableHead>{t("host")}</TableHead>
                  <TableHead>{t("deadline")}</TableHead>
                  <TableHead>{t("checked")}</TableHead>
                  <TableHead className="text-end">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(drafts ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell dir="ltr">
                      <Link
                        className="font-medium hover:underline"
                        href={`/club/opportunities/${row.id}`}
                      >
                        {row.title_en}
                      </Link>
                    </TableCell>
                    <TableCell dir="rtl">{row.title_ar}</TableCell>
                    <TableCell>{row.host_name ?? "—"}</TableCell>
                    <TableCell>
                      {row.deadline ? format.dateTime(row.deadline) : "—"}
                    </TableCell>
                    <TableCell>
                      <span className="grid gap-0.5">
                        <span>
                          {row.last_checked_on
                            ? format.date(row.last_checked_on)
                            : t("never")}
                        </span>
                        {row.source_url ? (
                          <a
                            className="text-muted-foreground text-xs underline"
                            href={row.source_url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {t("source")}
                          </a>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell>
                      {canWrite ? (
                        <span className="flex flex-wrap justify-end gap-2">
                          <ActionButton
                            action={markDraftChecked}
                            fields={{ id: row.id }}
                            size="sm"
                            variant="outline"
                          >
                            {t("checkedToday")}
                          </ActionButton>
                          <ActionButton
                            action={publishDraft}
                            confirm={{
                              title: t("publishConfirm", {
                                title: localized(row, "title", locale),
                              }),
                            }}
                            fields={{ id: row.id }}
                            size="sm"
                          >
                            {t("publish")}
                          </ActionButton>
                        </span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageBody>
    </>
  );
};

export default DraftsPage;
