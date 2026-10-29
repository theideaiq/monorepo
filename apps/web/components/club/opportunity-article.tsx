import { formatPrice, localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import {
  formatCalendarDate,
  formatDate,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import {
  Briefcase,
  CalendarDays,
  ExternalLink,
  MapPin,
  MoveLeft,
  Wallet,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { CoverImage } from "@/components/cover-image";
import { joinPath } from "@/lib/club";
import { editorialUrl, type OpportunityRow, type ProgramRow } from "@/lib/data";
import { Markdown } from "@/lib/markdown";
import { FollowButton } from "./follow-button";
import { isFeatured } from "./opportunity-card";
import { ProgramApply } from "./program-apply";
import { ProgramPackage } from "./program-package";

const day = (value: string) => new Date(`${value}T12:00:00`);

const Fact = ({
  children,
  icon: Icon,
  label,
}: {
  readonly children: ReactNode;
  readonly icon: typeof CalendarDays;
  readonly label: string;
}) => (
  <div className="flex gap-3">
    <Icon
      aria-hidden="true"
      className="mt-0.5 size-5 shrink-0 text-pink-text"
    />
    <div>
      <p className="font-medium text-sm">{label}</p>
      <p className="text-muted-foreground text-sm">{children}</p>
    </div>
  </div>
);

/**
 * Whether it's open, and where to apply: the organization's link, or here
 * for The IDEA's own programs.
 */
const WhereToApply = async ({
  closed,
  locale,
  notOpenYet,
  opportunity,
  program,
}: {
  readonly closed: boolean;
  readonly locale: Locale;
  readonly notOpenYet: boolean;
  readonly opportunity: OpportunityRow;
  readonly program: ProgramRow | null;
}) => {
  const t = await getTranslations({ locale, namespace: "web.opportunities" });
  const open = !(closed || notOpenYet);
  return (
    <>
      {closed ? <p className="text-sm">{t("closed")}</p> : null}
      {notOpenYet && opportunity.opens_at ? (
        <p className="text-sm">
          {t("opensOn", { date: formatDate(opportunity.opens_at, locale) })}
        </p>
      ) : null}
      {program ? (
        <ProgramApply
          open={open}
          passportRequired={program.passport_required}
          programId={program.opportunity_id}
        />
      ) : null}
      {!program && opportunity.apply_url && open ? (
        <Button asChild className="w-full">
          <a
            href={opportunity.apply_url}
            rel="noopener noreferrer"
            target="_blank"
          >
            {t("apply")}
            <ExternalLink aria-hidden="true" />
          </a>
        </Button>
      ) : null}
    </>
  );
};

/**
 * The facts beside an opportunity, and where to apply while it's open: on
 * the organization's side, or here for The IDEA's own programs.
 */
const Details = async ({
  locale,
  opportunity,
  program,
}: {
  readonly locale: Locale;
  readonly opportunity: OpportunityRow;
  readonly program: ProgramRow | null;
}) => {
  const t = await getTranslations({ locale, namespace: "web.opportunities" });
  const now = new Date();
  const closed =
    opportunity.status === "closed" ||
    Boolean(opportunity.deadline && new Date(opportunity.deadline) <= now);
  const notOpenYet = Boolean(
    opportunity.opens_at && new Date(opportunity.opens_at) > now
  );
  const deadline = opportunity.deadline
    ? formatDate(opportunity.deadline, locale)
    : t("rolling");
  let dates: string | null = null;
  if (opportunity.starts_on) {
    dates = opportunity.ends_on
      ? t("dates", {
          from: formatCalendarDate(day(opportunity.starts_on), locale),
          to: formatCalendarDate(day(opportunity.ends_on), locale),
        })
      : formatCalendarDate(day(opportunity.starts_on), locale);
  }
  const where =
    opportunity.remote && !opportunity.location
      ? t("online")
      : `${opportunity.location ?? ""}${opportunity.remote ? ` · ${t("online")}` : ""}`;

  return (
    <>
      <Fact icon={MapPin} label={t("where")}>
        {where}
      </Fact>
      <Fact icon={CalendarDays} label={t("deadline")}>
        {deadline}
      </Fact>
      {dates ? (
        <Fact icon={CalendarDays} label={t("when")}>
          {dates}
        </Fact>
      ) : null}
      {program ? null : (
        <Fact icon={Wallet} label={t("cost")}>
          {opportunity.applicant_fee > 0
            ? formatPrice(opportunity.applicant_fee, locale)
            : t("free")}
          {opportunity.fee_note ? ` · ${opportunity.fee_note}` : ""}
        </Fact>
      )}
      <WhereToApply
        closed={closed}
        locale={locale}
        notOpenYet={notOpenYet}
        opportunity={opportunity}
        program={program}
      />
    </>
  );
};

/**
 * An opportunity: who runs it, where, when applications open and close,
 * what applying costs, where to apply and "Notify me".
 */
export const OpportunityArticle = async ({
  locale,
  opportunity,
  program = null,
}: {
  readonly locale: Locale;
  readonly opportunity: OpportunityRow;
  /** The package, for The IDEA's programs sold here. */
  readonly program?: ProgramRow | null;
}) => {
  const t = await getTranslations({ locale, namespace: "web.opportunities" });
  const title = localized(opportunity, "title", locale);
  const summary = localized(opportunity, "summary", locale);
  const description = localized(opportunity, "description", locale);
  const cover = editorialUrl(opportunity.cover_image);

  return (
    <article className="container mx-auto max-w-4xl px-4 py-10">
      <Link
        className="mb-6 inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
        href={joinPath("opportunities")}
      >
        <MoveLeft className="size-4 rtl:rotate-180" />
        {t("back")}
      </Link>
      <p className="mb-2 flex flex-wrap items-center gap-2 font-medium text-pink-text text-sm">
        <Briefcase aria-hidden="true" className="size-4" />
        {t(`kinds.${opportunity.kind}`)}
        {isFeatured(opportunity) ? (
          <span className="text-muted-foreground">· {t("featured")}</span>
        ) : null}
      </p>
      <h1 className="mb-2 text-balance font-bold text-4xl tracking-tight">
        {title}
      </h1>
      <p className="mb-6 text-muted-foreground">
        {t("runBy", { name: opportunity.host_name ?? t("theIdea") })}
      </p>
      {cover ? (
        <CoverImage
          alt={title}
          className="mb-8 aspect-video"
          priority
          sizes="(min-width: 768px) 56rem, 100vw"
          src={cover}
        />
      ) : null}
      <div className="grid gap-8 md:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-4">
          {summary ? <p className="text-lg">{summary}</p> : null}
          {description ? (
            <Markdown
              className="prose prose-neutral dark:prose-invert max-w-none"
              locale={locale}
              source={description}
            />
          ) : null}
          {program ? (
            <ProgramPackage locale={locale} program={program} />
          ) : null}
        </div>
        <aside className="flex h-fit flex-col gap-4 rounded-lg border p-5">
          <Details
            locale={locale}
            opportunity={opportunity}
            program={program}
          />
          <FollowButton opportunityId={opportunity.id} />
        </aside>
      </div>
    </article>
  );
};
