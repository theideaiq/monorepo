import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { getProgramDocumentUrl } from "@repo/storage";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/admin/page";
import { isUuid } from "@/lib/admin/list";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import {
  ApplicantDetails,
  Installments,
  PassDetails,
  RefundPanel,
  StatusPanel,
} from "./panels";

/**
 * One application: the Pass details given, the emergency contact and
 * passport scans, the guardian's decision, the installments and any
 * refund, with the editor's decision and ending.
 */
const ApplicationPage = async ({
  params,
}: {
  readonly params: Promise<{ applicationId: string; id: string }>;
}) => {
  const { applicationId, id } = await params;
  if (!(isUuid(id) && isUuid(applicationId))) {
    notFound();
  }
  const { supabase } = await requireSection("editorial");
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("admin.editorial.programs");

  const [{ data: application }, { data: payments }, { data: listing }] =
    await Promise.all([
      supabase
        .from("program_applications")
        .select("*")
        .eq("id", applicationId)
        .eq("program_id", id)
        .maybeSingle(),
      supabase
        .from("program_payments")
        .select("position, amount, due_on, paid_at")
        .eq("application_id", applicationId)
        .order("position"),
      supabase
        .from("opportunities")
        .select("title_ar, title_en")
        .eq("id", id)
        .maybeSingle(),
    ]);
  if (!(application && listing)) {
    notFound();
  }
  const [names, scans] = await Promise.all([
    profileNames(supabase, [application.user_id, application.guardian_id]),
    Promise.all(
      application.passport_files.map(async (path) => ({
        path,
        url: await getProgramDocumentUrl(supabase, path).catch(() => null),
      }))
    ),
  ]);

  return (
    <>
      <PageHeader
        back={{
          href: `/club/opportunities/${id}/applications`,
          label: localized(listing, "title", locale),
        }}
        title={names.get(application.user_id) ?? t("unnamed")}
      />
      <PageBody className="xl:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-4">
          <PassDetails application={application} locale={locale} />
          <ApplicantDetails
            application={application}
            locale={locale}
            scans={scans}
          />
          {(payments ?? []).length > 0 ? (
            <Installments
              application={application}
              locale={locale}
              payments={payments ?? []}
            />
          ) : null}
        </div>
        <div className="grid content-start gap-4">
          <StatusPanel
            application={application}
            guardianName={
              application.guardian_id
                ? (names.get(application.guardian_id) ?? null)
                : null
            }
          />
          {application.refund_amount ? (
            <RefundPanel application={application} locale={locale} />
          ) : null}
        </div>
      </PageBody>
    </>
  );
};

export default ApplicationPage;
