import { Badge } from "@repo/design-system/components/ui/badge";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  EmptyState,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { requireSection } from "@/lib/admin/session";
import { CompaniesTabs } from "../_components/companies-tabs";
import {
  AddPartnerForm,
  PartnerActions,
  PartnerAnswersForm,
  PartnerReviewForm,
} from "./forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.companies.signIn");
  return { title: t("title") };
};

/** Testing or live, suspended, off, and the review. */
const PartnerBadges = async ({
  partner,
}: {
  readonly partner: {
    enabled: boolean;
    mode: string;
    review_status: string | null;
    suspended: boolean;
  };
}) => {
  const t = await getTranslations("admin.companies.signIn");
  return (
    <>
      <Badge variant="outline">
        {partner.mode === "live" ? t("live") : t("testing")}
      </Badge>
      {partner.suspended ? (
        <Badge variant="destructive">{t("suspended")}</Badge>
      ) : null}
      {partner.enabled ? null : (
        <span className="text-muted-foreground text-xs">{t("companyOff")}</span>
      )}
      {partner.review_status ? (
        <Badge
          variant={
            partner.review_status === "pending" ? "default" : "secondary"
          }
        >
          {partner.review_status === "pending" ? t("pending") : t("declined")}
        </Badge>
      ) : null}
    </>
  );
};

/**
 * Sign in with The IDEA Pass: the partner apps people can sign in to with
 * their Pass (staff-registered and companies' own), their return
 * addresses, what each asks, how many people are connected, and the
 * sensitive answers waiting for review.
 */
const SignInPartnersPage = async () => {
  const { canWrite, supabase } = await requireSection("companies");
  const locale = await getLocale();
  const t = await getTranslations("admin.companies.signIn");
  const tCompanies = await getTranslations("admin.companies");
  const format = formatters(locale);

  const [{ data: partners }, { data: organizations }] = await Promise.all([
    supabase.rpc("pass_apps"),
    supabase.from("organizations").select("id, name").order("name"),
  ]);
  const answerList = (answers: string[]) =>
    answers.map((answer) => t(`answerNames.${answer as "email"}`)).join(" · ");

  return (
    <>
      <PageHeader title={tCompanies("title")} />
      <CompaniesTabs />
      <PageBody>
        <Panel description={t("description")} title={t("title")}>
          {(partners ?? []).length === 0 ? (
            <EmptyState title={t("empty")} />
          ) : null}
          {(partners ?? []).map((partner) => (
            <div
              className="flex flex-wrap items-start justify-between gap-4 rounded-md border p-3"
              key={partner.client_id}
            >
              <div className="grid gap-1 text-sm">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {partner.name}
                  <PartnerBadges partner={partner} />
                </p>
                {partner.organization_name ? (
                  <p className="text-muted-foreground text-xs">
                    {t("company", { name: partner.organization_name })}
                  </p>
                ) : null}
                <p className="text-muted-foreground text-xs" dir="ltr">
                  {partner.client_id}
                </p>
                <p className="text-muted-foreground text-xs" dir="ltr">
                  {partner.redirect_uris.join(" · ")}
                </p>
                <p className="text-xs">
                  {t("asks", { answers: answerList(partner.answers) })}
                </p>
                {partner.review_status ? (
                  <p className="text-xs">
                    {t("requested", {
                      answers: answerList(partner.requested_answers),
                    })}
                  </p>
                ) : null}
                <p className="text-muted-foreground text-xs">
                  {t("connected", {
                    count: format.number(partner.connections),
                    date: format.date(partner.created_at),
                  })}
                </p>
              </div>
              {canWrite ? (
                <PartnerActions
                  active={!partner.suspended}
                  id={partner.client_id}
                />
              ) : null}
              {canWrite && partner.review_status === "pending" ? (
                <div className="basis-full rounded-md border border-dashed p-3">
                  <PartnerReviewForm id={partner.client_id} />
                </div>
              ) : null}
              {canWrite ? (
                <details className="basis-full">
                  <summary className="cursor-pointer text-sm">
                    {t("editAnswers")}
                  </summary>
                  <div className="pt-3">
                    <PartnerAnswersForm
                      answers={partner.answers}
                      id={partner.client_id}
                    />
                  </div>
                </details>
              ) : null}
            </div>
          ))}
        </Panel>
        {canWrite ? (
          <Panel description={t("addDescription")} title={t("addTitle")}>
            <AddPartnerForm
              organizations={(organizations ?? []).map((organization) => ({
                label: organization.name,
                value: organization.id,
              }))}
            />
          </Panel>
        ) : null}
      </PageBody>
    </>
  );
};

export default SignInPartnersPage;
