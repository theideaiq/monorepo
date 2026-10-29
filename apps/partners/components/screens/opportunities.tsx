"use client";

import { formatPrice } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { PlusIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  OPPORTUNITY_KINDS,
  type Opportunity,
  type OpportunityInput,
  type OpportunityKind,
  type OpportunityStatus,
  useDeleteOpportunity,
  useOpportunities,
  useOpportunityFollowers,
  useSaveOpportunity,
  useSetOpportunityStatus,
} from "@/lib/opportunity-queries";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs";

/** A Baghdad calendar day (YYYY-MM-DD) for a stored time. */
const baghdadDay = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(
        new Date(iso)
      )
    : "";

/** Opening is the start of a Baghdad day; the deadline its last minute. */
const dayStart = (day: string) => (day ? `${day}T00:00:00+03:00` : null);
const dayEnd = (day: string) => (day ? `${day}T23:59:00+03:00` : null);

const emptyInput = (): OpportunityInput => ({
  applicantFee: 0,
  applyUrl: "",
  deadline: null,
  descriptionAr: "",
  descriptionEn: "",
  endsOn: null,
  feeNote: "",
  kind: "internship",
  location: "",
  opensAt: null,
  remote: false,
  startsOn: null,
  summaryAr: "",
  summaryEn: "",
  titleAr: "",
  titleEn: "",
});

const inputOf = (row: Opportunity): OpportunityInput => ({
  applicantFee: row.applicant_fee,
  applyUrl: row.apply_url ?? "",
  deadline: row.deadline,
  descriptionAr: row.description_ar ?? "",
  descriptionEn: row.description_en ?? "",
  endsOn: row.ends_on,
  feeNote: row.fee_note ?? "",
  kind: row.kind,
  location: row.location ?? "",
  opensAt: row.opens_at,
  remote: row.remote,
  startsOn: row.starts_on,
  summaryAr: row.summary_ar ?? "",
  summaryEn: row.summary_en ?? "",
  titleAr: row.title_ar,
  titleEn: row.title_en,
});

const Field = ({
  children,
  hint,
  id,
  label,
}: {
  readonly children: ReactNode;
  readonly hint?: string;
  readonly id: string;
  readonly label: string;
}) => (
  <div className="grid gap-2">
    <Label htmlFor={id}>{label}</Label>
    {children}
    {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
  </div>
);

/** The listing's details; saving a listed one sends it back for review. */
const Editor = ({
  onDone,
  opportunity,
}: {
  readonly onDone: () => void;
  readonly opportunity?: Opportunity;
}) => {
  const t = useTranslations("app.company.opportunities.form");
  const kinds = useTranslations("app.company.opportunities.kinds");
  const { active } = useActiveOrganization();
  const save = useSaveOpportunity(active.id);
  const id = useId();
  const [form, setForm] = useState<OpportunityInput>(() =>
    opportunity ? inputOf(opportunity) : emptyInput()
  );
  const set = <K extends keyof OpportunityInput>(
    key: K,
    value: OpportunityInput[K]
  ) => setForm((current) => ({ ...current, [key]: value }));
  const listed =
    opportunity?.status === "approved" || opportunity?.status === "closed";
  const valid =
    form.titleAr.trim().length >= 2 &&
    form.titleEn.trim().length >= 2 &&
    (form.remote || form.location.trim().length >= 2) &&
    (!form.applyUrl.trim() || form.applyUrl.trim().startsWith("https://"));

  const submit = (send: boolean) => (event?: FormEvent) => {
    event?.preventDefault();
    if (valid) {
      save.mutate(
        { id: opportunity?.id, input: form, submit: send && !listed },
        { onSuccess: onDone }
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(opportunity ? "editTitle" : "newTitle")}</CardTitle>
        <CardDescription>
          {t(listed ? "listedNote" : "description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={submit(false)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${id}-kind`} label={t("kind")}>
              <select
                className={selectClassName}
                id={`${id}-kind`}
                onChange={(event) =>
                  set("kind", event.target.value as OpportunityKind)
                }
                value={form.kind}
              >
                {OPPORTUNITY_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kinds(kind)}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              hint={t("locationHint")}
              id={`${id}-location`}
              label={t("location")}
            >
              <Input
                id={`${id}-location`}
                maxLength={160}
                onChange={(event) => set("location", event.target.value)}
                value={form.location}
              />
            </Field>
            <Field id={`${id}-title-en`} label={t("titleEn")}>
              <Input
                dir="ltr"
                id={`${id}-title-en`}
                maxLength={160}
                onChange={(event) => set("titleEn", event.target.value)}
                required
                value={form.titleEn}
              />
            </Field>
            <Field id={`${id}-title-ar`} label={t("titleAr")}>
              <Input
                dir="rtl"
                id={`${id}-title-ar`}
                maxLength={160}
                onChange={(event) => set("titleAr", event.target.value)}
                required
                value={form.titleAr}
              />
            </Field>
            <Field id={`${id}-summary-en`} label={t("summaryEn")}>
              <Input
                dir="ltr"
                id={`${id}-summary-en`}
                maxLength={300}
                onChange={(event) => set("summaryEn", event.target.value)}
                value={form.summaryEn}
              />
            </Field>
            <Field id={`${id}-summary-ar`} label={t("summaryAr")}>
              <Input
                dir="rtl"
                id={`${id}-summary-ar`}
                maxLength={300}
                onChange={(event) => set("summaryAr", event.target.value)}
                value={form.summaryAr}
              />
            </Field>
            <Field
              hint={t("opensHint")}
              id={`${id}-opens`}
              label={t("opensOn")}
            >
              <Input
                id={`${id}-opens`}
                onChange={(event) =>
                  set("opensAt", dayStart(event.target.value))
                }
                type="date"
                value={baghdadDay(form.opensAt)}
              />
            </Field>
            <Field
              hint={t("deadlineHint")}
              id={`${id}-deadline`}
              label={t("deadline")}
            >
              <Input
                id={`${id}-deadline`}
                onChange={(event) =>
                  set("deadline", dayEnd(event.target.value))
                }
                type="date"
                value={baghdadDay(form.deadline)}
              />
            </Field>
            <Field id={`${id}-starts`} label={t("startsOn")}>
              <Input
                id={`${id}-starts`}
                onChange={(event) =>
                  set("startsOn", event.target.value || null)
                }
                type="date"
                value={form.startsOn ?? ""}
              />
            </Field>
            <Field id={`${id}-ends`} label={t("endsOn")}>
              <Input
                id={`${id}-ends`}
                onChange={(event) => set("endsOn", event.target.value || null)}
                type="date"
                value={form.endsOn ?? ""}
              />
            </Field>
            <Field
              hint={t("applyUrlHint")}
              id={`${id}-apply`}
              label={t("applyUrl")}
            >
              <Input
                dir="ltr"
                id={`${id}-apply`}
                maxLength={500}
                onChange={(event) => set("applyUrl", event.target.value)}
                type="url"
                value={form.applyUrl}
              />
            </Field>
            <Field hint={t("feeHint")} id={`${id}-fee`} label={t("fee")}>
              <Input
                dir="ltr"
                id={`${id}-fee`}
                inputMode="numeric"
                min={0}
                onChange={(event) =>
                  set("applicantFee", Math.max(0, Number(event.target.value)))
                }
                type="number"
                value={form.applicantFee || ""}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={form.remote}
              className="size-4 accent-primary"
              onChange={(event) => set("remote", event.target.checked)}
              type="checkbox"
            />
            {t("remote")}
          </label>
          <Field id={`${id}-fee-note`} label={t("feeNote")}>
            <Input
              id={`${id}-fee-note`}
              maxLength={300}
              onChange={(event) => set("feeNote", event.target.value)}
              value={form.feeNote}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${id}-description-en`} label={t("descriptionEn")}>
              <Textarea
                dir="ltr"
                id={`${id}-description-en`}
                maxLength={10_000}
                onChange={(event) => set("descriptionEn", event.target.value)}
                rows={6}
                value={form.descriptionEn}
              />
            </Field>
            <Field id={`${id}-description-ar`} label={t("descriptionAr")}>
              <Textarea
                dir="rtl"
                id={`${id}-description-ar`}
                maxLength={10_000}
                onChange={(event) => set("descriptionAr", event.target.value)}
                rows={6}
                value={form.descriptionAr}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={save.isPending || !valid} type="submit">
              {t(listed ? "saveAndReview" : "saveDraft")}
            </Button>
            {listed ? null : (
              <Button
                disabled={save.isPending || !valid}
                onClick={() => submit(true)()}
                type="button"
                variant="secondary"
              >
                {t("sendForReview")}
              </Button>
            )}
            <Button onClick={onDone} type="button" variant="ghost">
              {t("cancel")}
            </Button>
          </div>
          {save.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {t("failed")}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
};

const STATUS_VARIANT: Record<
  OpportunityStatus,
  "default" | "destructive" | "outline" | "secondary"
> = {
  approved: "default",
  changes: "destructive",
  closed: "outline",
  draft: "outline",
  pending: "secondary",
  rejected: "destructive",
};

/** What owners and admins can do with a listing in its status. */
const RowActions = ({
  onEdit,
  opportunity,
}: {
  readonly onEdit: () => void;
  readonly opportunity: Opportunity;
}) => {
  const t = useTranslations("app.company.opportunities.actions");
  const { active } = useActiveOrganization();
  const setStatus = useSetOpportunityStatus(active.id);
  const remove = useDeleteOpportunity(active.id);
  const status = opportunity.status as OpportunityStatus;
  const busy = setStatus.isPending || remove.isPending;
  const unlisted = ["changes", "draft", "rejected"].includes(status);

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onEdit} size="sm" variant="outline">
        {t("edit")}
      </Button>
      {unlisted ? (
        <Button
          disabled={busy}
          onClick={() =>
            setStatus.mutate({ id: opportunity.id, status: "pending" })
          }
          size="sm"
          variant="secondary"
        >
          {t("send")}
        </Button>
      ) : null}
      {status === "pending" ? (
        <Button
          disabled={busy}
          onClick={() =>
            setStatus.mutate({ id: opportunity.id, status: "draft" })
          }
          size="sm"
          variant="ghost"
        >
          {t("takeBack")}
        </Button>
      ) : null}
      {status === "approved" ? (
        <Button
          disabled={busy}
          onClick={() =>
            setStatus.mutate({ id: opportunity.id, status: "closed" })
          }
          size="sm"
          variant="ghost"
        >
          {t("close")}
        </Button>
      ) : null}
      {unlisted ? (
        <Button
          disabled={busy}
          onClick={() => remove.mutate(opportunity.id)}
          size="sm"
          variant="ghost"
        >
          {t("delete")}
        </Button>
      ) : null}
      {setStatus.isError || remove.isError ? (
        <p className="w-full text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};

const Row = ({
  followers,
  onEdit,
  opportunity,
}: {
  readonly followers: number;
  readonly onEdit: () => void;
  readonly opportunity: Opportunity;
}) => {
  const t = useTranslations("app.company.opportunities");
  const locale = useLocale() as Locale;
  const { canManage } = useActiveOrganization();
  const status = opportunity.status as OpportunityStatus;
  const featured =
    opportunity.featured_until &&
    new Date(opportunity.featured_until).getTime() > Date.now();
  const details = [
    t(`kinds.${opportunity.kind}`),
    opportunity.deadline
      ? t("closes", { date: formatDate(opportunity.deadline, locale) })
      : t("rolling"),
    t("followers", { count: formatNumber(followers, locale) }),
  ];
  if (opportunity.applicant_fee > 0) {
    details.push(
      t("feeToApply", {
        fee: formatPrice(opportunity.applicant_fee, locale),
      })
    );
  }

  return (
    <li className="grid gap-2 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">
          {locale === "ar" ? opportunity.title_ar : opportunity.title_en}
        </span>
        <Badge variant={STATUS_VARIANT[status]}>
          {t(`statuses.${status}`)}
        </Badge>
        {featured ? <Badge variant="secondary">{t("featured")}</Badge> : null}
      </div>
      <p className="text-muted-foreground text-xs">{details.join(" · ")}</p>
      {opportunity.review_note && ["changes", "rejected"].includes(status) ? (
        <p className="rounded-md bg-surface-sunken p-2">
          {t("reviewNote", { note: opportunity.review_note })}
        </p>
      ) : null}
      {canManage ? (
        <RowActions onEdit={onEdit} opportunity={opportunity} />
      ) : null}
    </li>
  );
};

const OpportunitiesBody = () => {
  const t = useTranslations("app.company.opportunities");
  const { active, canManage } = useActiveOrganization();
  const opportunities = useOpportunities(active.id);
  const followers = useOpportunityFollowers(active.id);
  // "new", an opportunity's id, or null when no editor is open.
  const [editing, setEditing] = useState<string | null>(null);

  if (opportunities.isPending) {
    return <SectionSpinner />;
  }
  if (opportunities.isError) {
    return <ErrorState onRetry={() => opportunities.refetch()} />;
  }
  const all = opportunities.data;
  const current = all.find((row) => row.id === editing);

  return (
    <div className="grid max-w-3xl gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-muted-foreground">{t("description")}</p>
        {canManage && editing === null ? (
          <Button onClick={() => setEditing("new")}>
            <PlusIcon />
            {t("new")}
          </Button>
        ) : null}
      </div>
      {editing === null ? null : (
        <Editor
          key={editing}
          onDone={() => setEditing(null)}
          opportunity={current}
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle>{t("listTitle")}</CardTitle>
          <CardDescription>{t("listDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {all.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("none")}</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {all.map((row) => (
                <Row
                  followers={Number(followers.data?.get(row.id) ?? 0)}
                  key={row.id}
                  onEdit={() => setEditing(row.id)}
                  opportunity={row}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Partners → Opportunities: jobs, internships, scholarships, competitions
 * and programs the organization lists in Club → Join, each reviewed by The
 * IDEA before it appears, with how many members follow it.
 */
export const Opportunities = () => (
  <BusinessShell feature="opportunities">
    <OpportunitiesBody />
  </BusinessShell>
);
