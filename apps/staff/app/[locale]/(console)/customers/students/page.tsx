import { localized } from "@repo/commerce";
import { getStudentCardUrl, getStudentDocumentUrl } from "@repo/storage";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  EmptyState,
  MaybeLink,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { academicYearEnd } from "@/lib/admin/dates";
import { formatters } from "@/lib/admin/format";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import { ReviewCardForm, ReviewDocumentForm, UniversityForm } from "./forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.customers.students");
  return { title: t("title") };
};

/**
 * Students: card photos waiting for review (approve until the end of the
 * academic year, or reject with a reason; the photo is deleted either way)
 * and the universities with their email domains.
 */
const StudentsPage = async () => {
  const { canWrite, supabase } = await requireSection("customers");
  const locale = await getLocale();
  const t = await getTranslations("admin.customers.students");
  const format = formatters(locale);

  const [
    { data: requests },
    { data: universities },
    { count: verified },
    { data: documents },
  ] = await Promise.all([
    supabase
      .from("student_requests")
      .select("id, user_id, university_id, card_path, created_at")
      .eq("method", "card")
      .eq("status", "pending")
      .order("created_at")
      .limit(50),
    supabase
      .from("universities")
      .select("id, name_ar, name_en, domains, active")
      .order("position"),
    supabase
      .from("student_badges")
      .select("user_id", { count: "exact", head: true })
      .gte("valid_until", new Date().toISOString().slice(0, 10)),
    supabase
      .from("student_verifications")
      .select(
        "id, email, university_id, document_kind, document_path, created_at, partner:pass_partners!inner (name)"
      )
      .eq("status", "pending")
      .order("created_at")
      .limit(50),
  ]);
  const waiting = documents ?? [];
  const documentLinks = await Promise.all(
    waiting.map((row) =>
      row.document_path
        ? getStudentDocumentUrl(supabase, row.document_path).catch(() => null)
        : null
    )
  );
  const pending = requests ?? [];
  const [names, photos] = await Promise.all([
    profileNames(
      supabase,
      pending.map((request) => request.user_id)
    ),
    Promise.all(
      pending.map((request) =>
        request.card_path
          ? getStudentCardUrl(supabase, request.card_path).catch(() => null)
          : null
      )
    ),
  ]);
  const universityName = (id: string) => {
    const row = universities?.find((university) => university.id === id);
    return row ? localized(row, "name", locale) : id;
  };
  const yearEnd = academicYearEnd();

  return (
    <>
      <PageHeader
        back={{ href: "/customers", label: t("back") }}
        description={t("verified", { count: format.number(verified ?? 0) })}
        title={t("title")}
      />
      <PageBody>
        <Panel description={t("reviewDescription")} title={t("review")}>
          {pending.length === 0 ? <EmptyState title={t("empty")} /> : null}
          {pending.map((request, index) => (
            <div
              className="grid gap-4 rounded-md border p-3 md:grid-cols-[16rem_1fr]"
              key={request.id}
            >
              {photos[index] ? (
                <a
                  href={photos[index] ?? undefined}
                  rel="noreferrer"
                  target="_blank"
                >
                  {/* biome-ignore lint/performance/noImgElement: a short-lived signed link */}
                  <img
                    alt={t("photoAlt")}
                    className="max-h-48 w-full rounded object-contain"
                    height={192}
                    src={photos[index] ?? undefined}
                    width={256}
                  />
                </a>
              ) : (
                <p className="text-muted-foreground text-sm">{t("noPhoto")}</p>
              )}
              <div className="grid content-start gap-3">
                <p className="text-sm">
                  <MaybeLink href={`/customers/${request.user_id}`}>
                    {names.get(request.user_id) ?? t("unnamed")}
                  </MaybeLink>
                  {" · "}
                  {universityName(request.university_id)}
                  {" · "}
                  {format.date(request.created_at)}
                </p>
                {canWrite ? (
                  <ReviewCardForm id={request.id} yearEnd={yearEnd} />
                ) : null}
              </div>
            </div>
          ))}
        </Panel>
        <div id="documents" />
        <Panel description={t("documentsDescription")} title={t("documents")}>
          {waiting.length === 0 ? (
            <EmptyState title={t("documentsEmpty")} />
          ) : null}
          {waiting.map((row, index) => {
            const partner = Array.isArray(row.partner)
              ? row.partner[0]
              : row.partner;
            const link = documentLinks[index];
            return (
              <div
                className="grid gap-4 rounded-md border p-3 md:grid-cols-[16rem_1fr]"
                key={row.id}
              >
                {link ? (
                  <a
                    className="text-sm underline"
                    href={link}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {row.document_path?.endsWith(".pdf") ? (
                      t("openDocument")
                    ) : (
                      // biome-ignore lint/performance/noImgElement: a short-lived signed link
                      <img
                        alt={t("documentAlt")}
                        className="max-h-48 w-full rounded object-contain"
                        height={192}
                        src={link}
                        width={256}
                      />
                    )}
                  </a>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t("noPhoto")}
                  </p>
                )}
                <div className="grid content-start gap-3">
                  <p className="text-sm">
                    {t("documentFor", { partner: partner?.name ?? "" })}
                    {" · "}
                    {universityName(row.university_id ?? "")}
                    {" · "}
                    {t(
                      `documentKinds.${row.document_kind === "enrollment" ? "enrollment" : "card"}`
                    )}
                    {" · "}
                    {format.date(row.created_at)}
                  </p>
                  <p className="text-muted-foreground text-xs" dir="ltr">
                    {row.email}
                  </p>
                  {canWrite ? <ReviewDocumentForm id={row.id} /> : null}
                </div>
              </div>
            );
          })}
        </Panel>
        <Panel
          description={t("universitiesDescription")}
          title={t("universities")}
        >
          {(universities ?? []).map((university) => (
            <UniversityForm
              disabled={!canWrite}
              key={university.id}
              university={university}
            />
          ))}
          {canWrite ? <UniversityForm disabled={false} /> : null}
        </Panel>
      </PageBody>
    </>
  );
};

export default StudentsPage;
