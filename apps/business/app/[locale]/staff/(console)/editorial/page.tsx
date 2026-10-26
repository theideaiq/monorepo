import { localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { Pagination } from "@/components/admin/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { pageRange, type SearchParams } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { publishState } from "@/lib/admin/publishing";
import { requireSection } from "@/lib/admin/session";
import { EditorialTabs } from "./_components/editorial-tabs";
import { setPostPublished } from "./actions";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.editorial");
  return { title: t("title") };
};

/** The IDEA Club: drafts, scheduled and published posts in every section. */
const PostsPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { canWrite, supabase } = await requireSection("editorial");
  const params = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin.editorial");
  const format = formatters(locale);
  const { from, page, to } = pageRange(params);

  const { count, data: posts } = await supabase
    .from("posts")
    .select("id, slug, section, title_ar, title_en, published_at, updated_at", {
      count: "exact",
    })
    .order("published_at", { ascending: false, nullsFirst: true })
    .order("updated_at", { ascending: false })
    .range(from, to);

  return (
    <>
      <PageHeader title={t("title")}>
        {canWrite ? (
          <Button asChild>
            <Link href="/editorial/posts/new">
              <PlusIcon />
              {t("posts.new")}
            </Link>
          </Button>
        ) : null}
      </PageHeader>
      <EditorialTabs />
      <PageBody>
        {(posts ?? []).length === 0 ? (
          <EmptyState title={t("posts.empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("posts.title")}</TableHead>
                  <TableHead>{t("publish.state")}</TableHead>
                  <TableHead>{t("publish.date")}</TableHead>
                  <TableHead className="text-end">
                    {t("publish.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(posts ?? []).map((post) => {
                  const state = publishState(post.published_at);
                  return (
                    <TableRow key={post.id}>
                      <TableCell>
                        <Link
                          className="font-medium hover:underline"
                          href={`/editorial/posts/${post.id}`}
                        >
                          {localized(post, "title", locale)}
                        </Link>
                        <span className="block text-muted-foreground text-xs">
                          {t(`posts.sections.${post.section}`)} ·{" "}
                          <span dir="ltr">{post.slug}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={state}>
                          {t(`publish.states.${state}`)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format.dateTime(post.published_at ?? post.updated_at)}
                      </TableCell>
                      <TableCell className="text-end">
                        {canWrite ? (
                          <ActionButton
                            action={setPostPublished}
                            fields={{
                              id: post.id,
                              publish: state === "draft" ? "true" : "false",
                            }}
                            variant="ghost"
                          >
                            {state === "draft"
                              ? t("publish.publishNow")
                              : t("publish.unpublish")}
                          </ActionButton>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <Pagination
          count={count}
          page={page}
          params={params}
          pathname="/editorial"
        />
      </PageBody>
    </>
  );
};

export default PostsPage;
