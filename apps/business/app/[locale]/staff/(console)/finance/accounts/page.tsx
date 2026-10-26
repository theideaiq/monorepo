import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { requireSection } from "@/lib/admin/session";
import { AccountForm } from "../_components/account-form";
import { FinanceTabs } from "../_components/finance-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance.tabs");
  return { title: t("accounts") };
};

/** The chart of accounts. Accounts in use can be deactivated, not deleted. */
const AccountsPage = async () => {
  const { canWrite, supabase } = await requireSection("finance");
  const t = await getTranslations("admin.finance");
  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("*")
    .order("code");

  return (
    <>
      <PageHeader title={t("title")} />
      <FinanceTabs />
      <PageBody>
        <Panel
          description={t("accounts.description")}
          title={t("tabs.accounts")}
        >
          {(accounts ?? []).map((account) => (
            <AccountForm
              account={account}
              disabled={!canWrite}
              key={account.id}
            />
          ))}
          {(accounts ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("accounts.empty")}
            </p>
          ) : null}
        </Panel>
        {canWrite ? (
          <Panel title={t("accounts.new")}>
            <AccountForm key={`new-${accounts?.length ?? 0}`} />
          </Panel>
        ) : null}
      </PageBody>
    </>
  );
};

export default AccountsPage;
