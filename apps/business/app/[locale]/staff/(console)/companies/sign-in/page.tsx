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
import { AddPartnerForm, PartnerActions } from "./forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.companies.signIn");
  return { title: t("title") };
};

/**
 * Sign in with The IDEA Pass: the partner sites people can sign in to
 * with their Pass, their return addresses, what each may ask and how
 * many people are connected.
 */
const SignInPartnersPage = async () => {
  const { canWrite, supabase } = await requireSection("companies");
  const locale = await getLocale();
  const t = await getTranslations("admin.companies.signIn");
  const tCompanies = await getTranslations("admin.companies");
  const format = formatters(locale);

  const [{ data: partners }, { data: organizations }, { data: connections }] =
    await Promise.all([
      supabase
        .from("pass_partners")
        .select(
          "client_id, name, website, redirect_uris, answers, active, created_at"
        )
        .order("name"),
      supabase.from("organizations").select("id, name").order("name"),
      supabase.from("pass_connections").select("client_id"),
    ]);
  const count = new Map<string, number>();
  for (const connection of connections ?? []) {
    count.set(connection.client_id, (count.get(connection.client_id) ?? 0) + 1);
  }

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
                <p className="font-medium">
                  {partner.name}
                  {partner.active ? null : (
                    <span className="ms-2 text-muted-foreground text-xs">
                      {t("off")}
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground text-xs" dir="ltr">
                  {partner.client_id}
                </p>
                <p className="text-muted-foreground text-xs" dir="ltr">
                  {partner.redirect_uris.join(" · ")}
                </p>
                <p className="text-xs">
                  {partner.answers
                    .map((answer) => t(`answerNames.${answer as "email"}`))
                    .join(" · ")}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("connected", {
                    count: format.number(count.get(partner.client_id) ?? 0),
                    date: format.date(partner.created_at),
                  })}
                </p>
              </div>
              {canWrite ? (
                <PartnerActions
                  active={partner.active}
                  id={partner.client_id}
                />
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
