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
import { SignedFiles, signAll } from "@/components/admin/signed-files";
import { academicYearEnd } from "@/lib/admin/dates";
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
  const yearEnd = academicYearEnd();
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
              <SignedFiles files={filesOf(row.id)} {...fileLabels} />
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
              <SignedFiles files={filesOf(row.id)} {...fileLabels} />
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
                <SignedFiles files={orgFiles[index] ?? []} {...fileLabels} />
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
