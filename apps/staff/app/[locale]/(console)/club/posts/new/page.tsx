import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/admin/page";
import { env } from "@/env";
import { requireSection } from "@/lib/admin/session";
import { PostForm } from "../../_components/post-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.editorial.posts");
  return { title: t("new") };
};

const NewPostPage = async () => {
  await requireSection("editorial", "write");
  const t = await getTranslations("admin.editorial");

  return (
    <>
      <PageHeader
        back={{ href: "/club", label: t("title") }}
        title={t("posts.new")}
      />
      <PageBody className="max-w-5xl">
        <PostForm
          mode="draft"
          publishAt=""
          supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
        />
      </PageBody>
    </>
  );
};

export default NewPostPage;
