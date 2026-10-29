import { localized } from "@repo/commerce";
import type { Tables } from "@repo/database";
import type { Locale } from "@repo/internationalization";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Panel } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import {
  EndApplicationForm,
  ReviewApplicationForm,
} from "../../../../_components/application-forms";
import { type ApplicationStatus, endOutcomes, guardianNote } from "../status";

type Application = Tables<"program_applications">;

const DETAILS = [
  "full_name",
  "legal_name",
  "birthday",
  "email",
  "phone",
  "whatsapp",
  "governorate",
  "area",
  "major",
  "study_year",
] as const;

const Row = ({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) => (
  <div className="grid gap-0.5 sm:grid-cols-[12rem_1fr]">
    <dt className="text-muted-foreground text-sm">{label}</dt>
    <dd className="text-sm">{children}</dd>
  </div>
);

/** Signed links to the passport scans (editors may read them). */
const Scans = ({
  files,
  missing,
  open,
}: {
  readonly files: { path: string; url: string | null }[];
  readonly missing: string;
  readonly open: string;
}) => (
  <ul className="grid gap-1 text-sm">
    {files.map(({ path, url }, index) => (
      <li key={path}>
        {url ? (
          <a className="underline" href={url} rel="noreferrer" target="_blank">
            {open} {index + 1}
          </a>
        ) : (
          <span className="text-muted-foreground">{missing}</span>
        )}
      </li>
    ))}
  </ul>
);

/** What the Pass held when they applied. */
export const PassDetails = async ({
  application,
  locale,
}: {
  readonly application: Application;
  readonly locale: Locale;
}) => {
  const t = await getTranslations("admin.editorial.programs");
  const format = formatters(locale);
  const details = (application.details ?? {}) as Record<string, string | null>;
  const university = localized(
    {
      university_ar: details.university_ar ?? "",
      university_en: details.university_en ?? "",
    },
    "university",
    locale
  );
  return (
    <Panel title={t("fromPass")}>
      <dl className="grid gap-2">
        {DETAILS.map((key) =>
          details[key] ? (
            <Row key={key} label={t(`details.${key}`)}>
              {key === "birthday"
                ? format.date(details[key])
                : String(details[key])}
            </Row>
          ) : null
        )}
        {university ? (
          <Row label={t("details.university")}>{university}</Row>
        ) : null}
      </dl>
    </Panel>
  );
};

/** The emergency contact, why they apply and the passport scans. */
export const ApplicantDetails = async ({
  application,
  locale,
  scans,
}: {
  readonly application: Application;
  readonly locale: Locale;
  readonly scans: { path: string; url: string | null }[];
}) => {
  const t = await getTranslations("admin.editorial.programs");
  const format = formatters(locale);
  return (
    <Panel title={t("fromApplicant")}>
      <dl className="grid gap-2">
        <Row label={t("emergency")}>
          {application.emergency_name} · {application.emergency_phone}
        </Row>
        {application.motivation ? (
          <Row label={t("motivation")}>{application.motivation}</Row>
        ) : null}
        <Row label={t("passport")}>
          {application.documents_removed_at
            ? t("scansRemoved", {
                date: format.date(application.documents_removed_at),
              })
            : null}
          {scans.length > 0 ? (
            <Scans
              files={scans}
              missing={t("scanMissing")}
              open={t("openScan")}
            />
          ) : null}
        </Row>
      </dl>
    </Panel>
  );
};

/** The installments fixed on acceptance, and which are paid. */
export const Installments = async ({
  application,
  locale,
  payments,
}: {
  readonly application: Application;
  readonly locale: Locale;
  readonly payments: Pick<
    Tables<"program_payments">,
    "amount" | "due_on" | "paid_at" | "position"
  >[];
}) => {
  const t = await getTranslations("admin.editorial.programs");
  const format = formatters(locale);
  return (
    <Panel
      description={application.plus_price ? t("plusPriceApplied") : undefined}
      title={t("installmentsTitle", { price: format.money(application.price) })}
    >
      <ul className="grid gap-1 text-sm">
        {payments.map((payment) => (
          <li key={payment.position}>
            {t("installmentLine", {
              amount: format.money(payment.amount),
              due: format.date(payment.due_on),
              number: String(payment.position),
            })}{" "}
            <span className="text-muted-foreground">
              {payment.paid_at
                ? t("paidOn", { date: format.date(payment.paid_at) })
                : t("unpaid")}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
};

/** Where the application stands, and the editor's decision or ending. */
export const StatusPanel = async ({
  application,
  guardianName,
}: {
  readonly application: Application;
  readonly guardianName: string | null;
}) => {
  const t = await getTranslations("admin.editorial.programs");
  const status = application.status as ApplicationStatus;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = Boolean(application.pay_by && application.pay_by < today);
  const outcomes = endOutcomes(status, overdue);
  const guardian = guardianNote(application.guardian_status);
  return (
    <Panel title={t("status")}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge status={status}>{t(`statuses.${status}`)}</StatusBadge>
        {guardian ? (
          <span className="text-muted-foreground">
            {t(`guardian.${guardian}`)}
          </span>
        ) : null}
      </div>
      {application.guardian_id ? (
        <p className="text-muted-foreground text-sm">
          {t("guardianName", { name: guardianName ?? t("unnamed") })}
        </p>
      ) : null}
      {application.cancel_reason ? (
        <p className="text-sm">
          {t(`reasons.${application.cancel_reason as "guardian"}`)}
        </p>
      ) : null}
      {application.review_note ? (
        <p className="text-muted-foreground text-sm">
          {application.review_note}
        </p>
      ) : null}
      {status === "submitted" || status === "waitlisted" ? (
        <ReviewApplicationForm id={application.id} />
      ) : null}
      {outcomes.length > 0 ? (
        <EndApplicationForm id={application.id} outcomes={outcomes} />
      ) : null}
    </Panel>
  );
};

/** The refund owed or paid; Finance pays it from Finance → Programs. */
export const RefundPanel = async ({
  application,
  locale,
}: {
  readonly application: Application;
  readonly locale: Locale;
}) => {
  const t = await getTranslations("admin.editorial.programs");
  const format = formatters(locale);
  return (
    <Panel title={t("refund")}>
      <p className="text-sm">
        {application.refunded_at
          ? t("refunded", {
              amount: format.money(application.refund_amount),
              date: format.date(application.refunded_at),
            })
          : t("refundDue", { amount: format.money(application.refund_amount) })}
      </p>
      {application.refund_reference ? (
        <p className="text-muted-foreground text-sm">
          {application.refund_reference}
        </p>
      ) : null}
      {application.refunded_at ? null : (
        <p className="text-muted-foreground text-sm">{t("refundByFinance")}</p>
      )}
    </Panel>
  );
};
