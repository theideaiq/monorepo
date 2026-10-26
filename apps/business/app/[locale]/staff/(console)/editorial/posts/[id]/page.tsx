import { localized } from "@repo/commerce";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { PageBody, PageHeader } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { env } from "@/env";
import { toBaghdadInput } from "@/lib/admin/dates";
import { isUuid } from "@/lib/admin/list";
import { publishState } from "@/lib/admin/publishing";
import { requireSection } from "@/lib/admin/session";
import { PostForm } from "../../_components/post-form";
import { deletePost } from "../../actions";

const modes = {
  draft: "draft",
  published: "now",
  scheduled: "schedule",
} as const;

const PostPage = async ({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const { supabase } = await requireSection("editorial", "write");
  const locale = await getLocale();
  const t = await getTranslations("admin.editorial");
  const tCommon = await getTranslations("admin.common");
  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!post) {
    notFound();
  }
  const state = publishState(post.published_at);

  return (
    <>
      <PageHeader
        back={{ href: "/editorial", label: t("title") }}
        description={post.slug}
        title={localized(post, "title", locale)}
      >
        <StatusBadge status={state}>{t(`publish.states.${state}`)}</StatusBadge>
        <ActionButton
          action={deletePost}
          confirm={{
            description: tCommon("deleteDescription"),
            title: tCommon("deleteConfirm"),
          }}
          fields={{ id: post.id }}
          variant="destructive"
        >
          {tCommon("delete")}
        </ActionButton>
      </PageHeader>
      <PageBody className="max-w-5xl">
        <PostForm
          mode={modes[state]}
          post={post}
          publishAt={
            state === "scheduled" ? toBaghdadInput(post.published_at) : ""
          }
          supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
        />
      </PageBody>
    </>
  );
};

export default PostPage;
