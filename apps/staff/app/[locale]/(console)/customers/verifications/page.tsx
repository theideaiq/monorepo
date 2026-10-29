import { getOrganizationFileUrl, getVerificationFileUrl } from "@repo/storage";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  EmptyState,
  MaybeLink,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import {
  ReviewEducatorForm,
  ReviewIdentityForm,
  ReviewOrganizationForm,
} from "./forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.customers.verifications");
  return { title: t("title") };
};

/** 30 June of the academic year today is in (Baghdad time). */
const academicYearEnd = (today: Date) => {
  const local = new Date(
    today.toLocaleString("en-US", { timeZone: "Asia/Baghdad" })
  );
  const year = local.getFullYear() + (local.getMonth() >= 6 ? 1 : 0);
  return `${year}-06-30`;
};

const signAll = (paths: string[], sign: (path: string) => Promise<string>) =>
  Promise.all(
    paths.map(async (path) => ({
      path,
      url: await sign(path).catch(() => null),
    }))
  );

/** Signed links to a request's files: images inline, PDFs as links. */
const Files = ({
  files,
  imageAlt,
  openLabel,
  missingLabel,
}: {
  readonly files: { path: string; url: string | null }[];
  readonly imageAlt: string;
  readonly missingLabel: string;
  readonly openLabel: string;
}) => (
  <div className="flex flex-wrap gap-2">
    {files.map(({ path, url }) => {
      if (!url) {
        return (
          <p className="text-muted-foreground text-sm" key={path}>
            {missingLabel}
          </p>
        );
      }
      return (
        <a href={url} key={path} rel="noreferrer" target="_blank">
          {path.toLowerCase().endsWith(".pdf") ? (
            <span className="text-sm underline">{openLabel}</span>
          ) : (
            // biome-ignore lint/performance/noImgElement: a short-lived signed link
            <img
              alt={imageAlt}
              className="max-h-40 w-48 rounded object-contain"
              height={160}
              src={url}
              width={192}
            />
          )}
        </a>
      );
    })}
  </div>
);

/**
 * Verification reviews: identity checks (approve with the name on the card;
 * the photos are deleted either way), educator documents (approve until a
 * date) and organizations verifying by letter or as a student society.
 */
const VerificationsPage = async () => {
  const { canWrite, supabase } = await requireSection("customers");
  const locale = await getLocale();
  const t = await getTranslations("admin.customers.verifications");
  const format = formatters(locale);

  const [{ data: requests }, { data: organizations }] = await Promise.all([
    supabase
      .from("verification_requests")
      .select("id, user_id, kind, institution, files, created_at")
      .eq("status", "pending")
      .or("kind.eq.identity,method.eq.documents")
      .order("created_at")
      .limit(100),
    supabase
      .from("organization_verifications")
      .select(
        "organization_id, method, letter, is_student_society, university, approval, requested_at, organization:organizations (name)"
      )
      .eq("status", "pending")
      .order("requested_at")
      .limit(50),
  ]);
  const pending = requests ?? [];
  const identity = pending.filter((row) => row.kind === "identity");
  const educators = pending.filter((row) => row.kind === "educator");
  const orgs = organizations ?? [];

  const [names, requestFiles, orgFiles] = await Promise.all([
    profileNames(
      supabase,
      pending.map((row) => row.user_id)
    ),
    Promise.all(
      pending.map((row) =>
        signAll(row.files ?? [], (path) =>
          getVerificationFileUrl(supabase, path)
        )
      )
    ),
    Promise.all(
      orgs.map((row) =>
        signAll(
          [row.letter, row.approval].filter((path): path is string =>
            Boolean(path)
          ),
          (path) => getOrganizationFileUrl(supabase, path)
        )
      )
    ),
  ]);
  const filesOf = (id: string) =>
    requestFiles[pending.findIndex((row) => row.id === id)] ?? [];
  const yearEnd = academicYearEnd(new Date());
  const fileLabels = {
    imageAlt: t("documentAlt"),
    missingLabel: t("noFile"),
    openLabel: t("openDocument"),
  };

  const member = (row: (typeof pending)[number]) => (
    <MaybeLink href={`/customers/${row.user_id}`}>
      {names.get(row.user_id) ?? t("unnamed")}
    </MaybeLink>
  );

  return (
    <>
      <PageHeader
        back={{ href: "/customers", label: t("back") }}
        description={t("description")}
        title={t("title")}
      />
      <PageBody>
        <div id="identity" />
        <Panel description={t("identityDescription")} title={t("identity")}>
          {identity.length === 0 ? (
            <EmptyState title={t("identityEmpty")} />
          ) : null}
          {identity.map((row) => (
            <div className="grid gap-3 rounded-md border p-3" key={row.id}>
              <p className="text-sm">
                {member(row)}
                {" · "}
                {format.date(row.created_at)}
              </p>
              <Files files={filesOf(row.id)} {...fileLabels} />
              {canWrite ? <ReviewIdentityForm id={row.id} /> : null}
            </div>
          ))}
        </Panel>
        <div id="educators" />
        <Panel description={t("educatorsDescription")} title={t("educators")}>
          {educators.length === 0 ? (
            <EmptyState title={t("educatorsEmpty")} />
          ) : null}
          {educators.map((row) => (
            <div className="grid gap-3 rounded-md border p-3" key={row.id}>
              <p className="text-sm">
                {member(row)}
                {" · "}
                {row.institution}
                {" · "}
                {format.date(row.created_at)}
              </p>
              <Files files={filesOf(row.id)} {...fileLabels} />
              {canWrite ? (
                <ReviewEducatorForm id={row.id} yearEnd={yearEnd} />
              ) : null}
            </div>
          ))}
        </Panel>
        <div id="organizations" />
        <Panel
          description={t("organizationsDescription")}
          title={t("organizations")}
        >
          {orgs.length === 0 ? (
            <EmptyState title={t("organizationsEmpty")} />
          ) : null}
          {orgs.map((row, index) => {
            const organization = Array.isArray(row.organization)
              ? row.organization[0]
              : row.organization;
            return (
              <div
                className="grid gap-3 rounded-md border p-3"
                key={row.organization_id}
              >
                <p className="text-sm">
                  <span className="font-medium">
                    {organization?.name ?? t("unnamed")}
                  </span>
                  {" · "}
                  {t(row.method === "domain" ? "byDomain" : "byLetter")}
                  {row.is_student_society
                    ? ` · ${t("society", { university: row.university ?? "" })}`
                    : null}
                  {" · "}
                  {format.date(row.requested_at)}
                </p>
                <Files files={orgFiles[index] ?? []} {...fileLabels} />
                {canWrite ? (
                  <ReviewOrganizationForm id={row.organization_id} />
                ) : null}
              </div>
            );
          })}
        </Panel>
      </PageBody>
    </>
  );
};

export default VerificationsPage;
