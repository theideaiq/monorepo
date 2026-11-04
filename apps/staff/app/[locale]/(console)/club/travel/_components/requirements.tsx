import { localized } from "@repo/commerce";
import type { Tables } from "@repo/database";
import type { Locale } from "@repo/internationalization";
import { ExternalLinkIcon, TriangleAlertIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { EmptyState } from "@/components/admin/page";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { byPosition } from "@/lib/admin/travel";
import { deleteTravelRequirement } from "../actions";
import { RequirementForm, type RequirementParent } from "./requirement-form";

type Requirement = Tables<"travel_requirements">;

const confidenceTones: Record<Requirement["confidence"], Tone> = {
  official: "success",
  secondary: "info",
  unconfirmed: "warning",
};

/** Its source, when it was checked, copies, scheduling and order. */
const RequirementFacts = async ({ line }: { readonly line: Requirement }) => {
  const t = await getTranslations("admin.editorial.travel");
  const tCommon = await getTranslations("admin.common");
  const format = formatters((await getLocale()) as Locale);
  const lead =
    line.anchor && line.lead_days !== null
      ? t(line.anchor === "appointment" ? "leadAppointment" : "leadDeparture", {
          days: format.number(line.lead_days),
        })
      : null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
      <a
        className="inline-flex items-center gap-1 underline"
        dir="ltr"
        href={line.source_url}
        rel="noopener noreferrer"
        target="_blank"
      >
        {t("source")}
        <ExternalLinkIcon aria-hidden="true" className="size-3" />
      </a>
      <span>{t("checkedLine", { date: format.date(line.checked_on) })}</span>
      {line.copies === null ? null : (
        <span>{t("copiesLine", { count: format.number(line.copies) })}</span>
      )}
      {lead ? <span>{lead}</span> : null}
      <span>
        {tCommon("position")} {format.number(line.position)}
      </span>
    </div>
  );
};

/** One line: title and chips, a warning when not confirmed, its facts. */
const RequirementLine = async ({
  canWrite,
  line,
  parent,
}: {
  readonly canWrite: boolean;
  readonly line: Requirement;
  readonly parent: RequirementParent;
}) => {
  const t = await getTranslations("admin.editorial.travel");
  const tCommon = await getTranslations("admin.common");
  const locale = await getLocale();
  const detail = localized(line, "detail", locale);

  return (
    <li className="grid gap-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{localized(line, "title", locale)}</span>
        <StatusBadge tone="neutral">{t(`kinds.${line.kind}`)}</StatusBadge>
        {line.doc_key ? (
          <code className="text-muted-foreground text-xs" dir="ltr">
            {line.doc_key}
          </code>
        ) : null}
        <StatusBadge tone={confidenceTones[line.confidence]}>
          {t(`confidences.${line.confidence}`)}
        </StatusBadge>
        {line.minors_only ? (
          <StatusBadge tone="info">{t("minorsBadge")}</StatusBadge>
        ) : null}
      </div>
      {line.confidence === "unconfirmed" ? (
        <p className="flex items-center gap-1 text-sm">
          <TriangleAlertIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-warning"
          />
          {t("unconfirmedWarning")}
        </p>
      ) : null}
      {detail ? (
        <p className="whitespace-pre-line text-muted-foreground text-sm">
          {detail}
        </p>
      ) : null}
      <RequirementFacts line={line} />
      {canWrite ? (
        <div className="flex flex-wrap items-start gap-2">
          <details className="min-w-0 flex-1">
            <summary className="cursor-pointer text-sm underline">
              {tCommon("edit")}
            </summary>
            <div className="pt-3">
              <RequirementForm parent={parent} requirement={line} />
            </div>
          </details>
          <ActionButton
            action={deleteTravelRequirement}
            confirm={{ title: t("deleteRequirementConfirm") }}
            fields={{ id: line.id }}
            variant="ghost"
          >
            {tCommon("delete")}
          </ActionButton>
        </div>
      ) : null}
    </li>
  );
};

/**
 * A route's or a program's requirements in order, each with how sure it
 * is, its source and when it was checked; editors change or delete each
 * line and add new ones below.
 */
export const Requirements = async ({
  canWrite,
  parent,
  requirements,
}: {
  readonly canWrite: boolean;
  readonly parent: RequirementParent;
  readonly requirements: readonly Requirement[];
}) => {
  const t = await getTranslations("admin.editorial.travel");

  return (
    <div className="grid gap-4">
      {requirements.length === 0 ? (
        <EmptyState title={t("requirementsEmpty")} />
      ) : (
        <ol className="grid gap-3">
          {byPosition(requirements).map((line) => (
            <RequirementLine
              canWrite={canWrite}
              key={line.id}
              line={line}
              parent={parent}
            />
          ))}
        </ol>
      )}
      {canWrite ? (
        <details className="rounded-lg border border-dashed p-3">
          <summary className="cursor-pointer font-medium text-sm">
            {t("addRequirement")}
          </summary>
          <div className="pt-3">
            <RequirementForm parent={parent} />
          </div>
        </details>
      ) : null}
    </div>
  );
};
