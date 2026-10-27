import { Button } from "@repo/design-system/components/ui/button";
import { fileNameOf, getSubmissionFileUrl } from "@repo/storage";
import { ExternalLinkIcon, FileTextIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { MarkdownPreview } from "@/components/admin/markdown-preview";
import {
  DetailList,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { isUuid } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { requireSection } from "@/lib/admin/session";
import {
  AssignForm,
  DecisionForm,
  RubricForm,
} from "../../_components/review-forms";
import { publishSubmission } from "../../actions";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.editorial.review");
  return { title: t("title") };
};

const IMAGE = /\.(png|jpe?g)$/i;

/**
 * Reviewing one submission. The work is shown without its author until a
 * decision is made; the rubric stays with the editors.
 */
const ReviewPage = async ({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const { supabase } = await requireSection("editorial", "write");
  const t = await getTranslations("admin.editorial.review");
  const tEditorial = await getTranslations("admin.editorial");
  const tStore = await getTranslations("store");
  const format = formatters(await getLocale());

  const [
    { data: submission },
    { data: review },
    { data: staffRows },
    { data: post },
  ] = await Promise.all([
    // No author_id here: blind review.
    supabase
      .from("submissions")
      .select(
        "id, title, type, body, file_path, status, assigned_to, decision_note, submitted_at, decided_at"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("submission_reviews")
      .select("*")
      .eq("submission_id", id)
      .maybeSingle(),
    supabase
      .from("staff")
      .select("user_id, role")
      .in("role", ["editor", "admin", "superadmin"]),
    supabase.from("posts").select("id").eq("submission_id", id).maybeSingle(),
  ]);
  if (!submission) {
    notFound();
  }

  const decided =
    submission.status === "accepted" || submission.status === "rejected";
  const [{ data: editorProfiles }, author, fileUrl] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .in(
        "id",
        (staffRows ?? []).map((row) => row.user_id)
      ),
    decided
      ? supabase
          .rpc("review_queue")
          .then(({ data }) => data?.find((row) => row.id === id) ?? null)
      : Promise.resolve(null),
    submission.file_path
      ? getSubmissionFileUrl(supabase, submission.file_path, 60 * 30).catch(
          () => null
        )
      : Promise.resolve(null),
  ]);
  const editors = (editorProfiles ?? []).map((profile) => ({
    id: profile.id,
    name: profile.full_name ?? t("unnamedEditor"),
  }));

  return (
    <>
      <PageHeader
        back={{
          href: "/club/submissions",
          label: tEditorial("tabs.submissions"),
        }}
        description={tStore(`submissionType.${submission.type}`)}
        title={submission.title}
      >
        <StatusBadge status={submission.status}>
          {tStore(`submissionStatus.${submission.status}`)}
        </StatusBadge>
      </PageHeader>
      <PageBody className="xl:grid-cols-[1fr_26rem]">
        <Panel title={t("work")}>
          <DetailList
            items={[
              {
                label: t("author"),
                value: author?.author_name ?? t("hidden"),
              },
              {
                label: t("submitted"),
                value: format.dateTime(submission.submitted_at),
              },
              ...(submission.decided_at
                ? [
                    {
                      label: t("decided"),
                      value: format.dateTime(submission.decided_at),
                    },
                  ]
                : []),
            ]}
          />
          {submission.file_path ? (
            <div className="grid gap-3">
              {fileUrl && IMAGE.test(submission.file_path) ? (
                // biome-ignore lint/performance/noImgElement: signed, short-lived URL
                <img
                  alt={submission.title}
                  className="h-auto max-h-[70vh] w-full rounded-md border object-contain"
                  height={900}
                  src={fileUrl}
                  width={1200}
                />
              ) : null}
              {fileUrl ? (
                <Button asChild className="w-fit" variant="outline">
                  <a href={fileUrl} rel="noopener noreferrer" target="_blank">
                    <FileTextIcon />
                    <span dir="auto">{fileNameOf(submission.file_path)}</span>
                    <ExternalLinkIcon />
                  </a>
                </Button>
              ) : (
                <p className="text-destructive text-sm">{t("fileMissing")}</p>
              )}
            </div>
          ) : null}
          {submission.body ? (
            <div className="rounded-md border p-4 md:p-6">
              <MarkdownPreview
                className="prose-base"
                dir="auto"
                source={submission.body}
              />
            </div>
          ) : null}
        </Panel>

        <div className="grid content-start gap-6">
          <Panel title={t("assignment")}>
            <AssignForm
              assignee={submission.assigned_to}
              editors={editors}
              id={submission.id}
            />
          </Panel>
          <Panel description={t("rubricHint")} title={t("rubric")}>
            <RubricForm id={submission.id} review={review} />
          </Panel>
          <Panel title={t("decision")}>
            <DecisionForm
              decisionNote={submission.decision_note}
              id={submission.id}
              status={submission.status}
            />
          </Panel>
          {submission.status === "accepted" ? (
            <Panel description={t("publishHint")} title={t("publish")}>
              {post ? (
                <Button asChild className="w-fit" variant="outline">
                  <Link href={`/club/posts/${post.id}`}>{t("openPost")}</Link>
                </Button>
              ) : (
                <ActionButton
                  action={publishSubmission}
                  fields={{ id: submission.id }}
                >
                  {t("createPost")}
                </ActionButton>
              )}
            </Panel>
          ) : null}
        </div>
      </PageBody>
    </>
  );
};

export default ReviewPage;
