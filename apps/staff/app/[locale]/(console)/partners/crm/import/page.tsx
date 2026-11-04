import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import {
  ORG_ALIASES,
  ORG_COLUMNS,
  PEOPLE_ALIASES,
  PEOPLE_COLUMNS,
} from "@/lib/admin/partner-crm";
import { requireSection } from "@/lib/admin/session";
import { ImportPanel } from "../_components/import-panel";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.partnerCrm.import");
  return { title: t("title") };
};

/** The other headers that mean each column, for the columns list. */
const aliasesOf = (aliases: Record<string, string>, column: string) =>
  Object.entries(aliases)
    .filter(([, target]) => target === column)
    .map(([alias]) => alias);

const Columns = async ({
  aliases,
  columns,
  scope,
}: {
  readonly aliases: Record<string, string>;
  readonly columns: readonly string[];
  readonly scope: "orgColumns" | "peopleColumns";
}) => {
  const t = await getTranslations("admin.partnerCrm.import");
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
      {columns.map((column) => {
        const others = aliasesOf(aliases, column);
        return (
          <div className="contents" key={column}>
            <dt className="font-medium font-mono" dir="ltr">
              {column}
            </dt>
            <dd className="grid gap-0.5 text-muted-foreground">
              <span>{t(`${scope}.${column}` as `orgColumns.name`)}</span>
              {others.length > 0 ? (
                <span className="font-mono text-xs" dir="ltr">
                  {others.join(", ")}
                </span>
              ) : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
};

/** Imports the outreach workbook's CSV export, after a preview. */
const PartnerCrmImportPage = async () => {
  await requireSection("partnerCrm", "write");
  const t = await getTranslations("admin.partnerCrm");
  const tNav = await getTranslations("admin.nav");

  return (
    <>
      <PageHeader
        back={{ href: "/partners/crm", label: tNav("partnerCrm") }}
        title={t("import.title")}
      />
      <PageBody className="max-w-6xl">
        <ImportPanel />
        <Panel
          description={t("import.columnsDescription")}
          title={t("import.orgColumnsTitle")}
        >
          <Columns
            aliases={ORG_ALIASES}
            columns={ORG_COLUMNS}
            scope="orgColumns"
          />
        </Panel>
        <Panel
          description={t("import.peopleColumnsDescription")}
          title={t("import.peopleColumnsTitle")}
        >
          <Columns
            aliases={PEOPLE_ALIASES}
            columns={PEOPLE_COLUMNS}
            scope="peopleColumns"
          />
        </Panel>
      </PageBody>
    </>
  );
};

export default PartnerCrmImportPage;
