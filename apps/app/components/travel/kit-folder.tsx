"use client";

import { localized } from "@repo/commerce";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/design-system/components/ui/alert-dialog";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Switch } from "@repo/design-system/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@repo/design-system/components/ui/toggle-group";
import { cn } from "@repo/design-system/lib/utils";
import type { Locale } from "@repo/internationalization";
import {
  formatCalendarDate,
  formatNumber,
  intlLocale,
} from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  ClockIcon,
  PrinterIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useId, useState } from "react";
import { ErrorState, SectionSpinner } from "@/components/states";
import { countryName } from "@/lib/club";
import {
  applicableRequirements,
  baghdadToday,
  calendarDay,
  type DocumentStatus,
  documentStatus,
  documentStatuses,
  isDocumentStatus,
  type KitTab,
  kitDocuments,
  kitsPath,
  kitTabs,
  openQuestions,
  printouts,
  readyShare,
  type ScheduleState,
  schedule,
  type TravelRequirement,
} from "@/lib/travel-kit";
import {
  type Kit,
  useDeleteKit,
  useDocumentStatuses,
  useKit,
  useKitRequirements,
  useKitTicks,
  useSetDocumentStatus,
  useTickKit,
  useUpdateKit,
} from "@/lib/travel-queries";
import { BulbMeter } from "./bulb-meter";
import { RequirementFacts } from "./requirement-facts";

/** A sheet of paper in the folder. */
const Sheet = ({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) => (
  <div
    className={cn(
      "rounded-lg border bg-surface-raised p-4 shadow-1 md:p-6",
      className
    )}
  >
    {children}
  </div>
);

/** A requirement's title and detail, in the page's language. */
const RequirementText = ({
  requirement,
}: {
  readonly requirement: TravelRequirement;
}) => {
  const t = useTranslations("app.travel.kit");
  const locale = useLocale() as Locale;
  const detail = localized(requirement, "detail", locale);
  return (
    <div className="grid gap-1">
      <p className="flex flex-wrap items-center gap-2 font-medium">
        {localized(requirement, "title", locale)}
        {requirement.minors_only ? (
          <Badge variant="neutral">{t("guardian")}</Badge>
        ) : null}
      </p>
      {detail ? (
        <p className="whitespace-pre-line text-muted-foreground text-sm">
          {detail}
        </p>
      ) : null}
    </div>
  );
};

const Facts = ({
  requirement,
}: {
  readonly requirement: TravelRequirement;
}) => (
  <RequirementFacts
    checkedOn={requirement.checked_on}
    confidence={requirement.confidence}
    sourceUrl={requirement.source_url}
  />
);

/** The cover: the route, the program and the bulb filling as documents get ready. */
const Cover = ({
  kit,
  ready,
  share,
  total,
}: {
  readonly kit: Kit;
  readonly ready: number;
  readonly share: number;
  readonly total: number;
}) => {
  const t = useTranslations("app.travel.kit");
  const locale = useLocale() as Locale;
  const progress =
    total > 0
      ? t("progress", {
          ready: formatNumber(ready, locale),
          total: formatNumber(total, locale),
        })
      : t("noDocuments");
  return (
    <div className="flex items-center gap-4 rounded-xl bg-idea-pink p-5 text-on-pink shadow-2 md:p-6">
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="font-medium text-sm">{t("kicker")}</p>
        <h1 className="text-balance font-bold text-2xl tracking-tight">
          {kit.route
            ? t("route", {
                country: countryName(kit.route.country, intlLocale(locale)),
                visa: localized(kit.route, "visa", locale),
              })
            : t("routeGone")}
        </h1>
        {kit.opportunity ? (
          <Link
            className="truncate text-sm underline"
            href={`/club/opportunities/${encodeURIComponent(kit.opportunity.slug)}`}
          >
            {localized(kit.opportunity, "title", locale)}
          </Link>
        ) : null}
        <p className="font-mono text-sm">{progress}</p>
      </div>
      <BulbMeter className="w-16 md:w-20" label={progress} share={share} />
    </div>
  );
};

/** The kit's own details: dates, the under-18 switch and notes. */
const KitDetails = ({ kit }: { readonly kit: Kit }) => {
  const t = useTranslations("app.travel.kit");
  const locale = useLocale() as Locale;
  const update = useUpdateKit(kit.id);
  const [notes, setNotes] = useState(kit.notes ?? "");
  const id = useId();
  const { route } = kit;
  const applyAt = route ? localized(route, "apply_at", locale) : "";
  const ask = route ? localized(route, "ask", locale) : "";
  const note = route ? localized(route, "note", locale) : "";

  const saveDate = (
    field: "appointment_on" | "departure_on",
    value: string
  ) => {
    const next = value || null;
    if (next !== kit[field]) {
      update.mutate({ [field]: next });
    }
  };

  return (
    <Sheet className="grid gap-5">
      {note ? <p className="text-sm">{note}</p> : null}
      {applyAt || ask ? (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {applyAt ? (
            <div>
              <dt className="font-medium">{t("applyAt")}</dt>
              <dd className="whitespace-pre-line text-muted-foreground">
                {applyAt}
              </dd>
            </div>
          ) : null}
          {ask ? (
            <div>
              <dt className="font-medium">{t("ask")}</dt>
              <dd className="whitespace-pre-line text-muted-foreground">
                {ask}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <fieldset className="grid gap-3">
        <legend className="mb-1 font-semibold">{t("dates")}</legend>
        <p className="text-muted-foreground text-sm">{t("datesHint")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-appointment`}>{t("appointment")}</Label>
            <Input
              defaultValue={kit.appointment_on ?? ""}
              id={`${id}-appointment`}
              onBlur={(event) =>
                saveDate("appointment_on", event.currentTarget.value)
              }
              type="date"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-departure`}>{t("departure")}</Label>
            <Input
              defaultValue={kit.departure_on ?? ""}
              id={`${id}-departure`}
              onBlur={(event) =>
                saveDate("departure_on", event.currentTarget.value)
              }
              type="date"
            />
          </div>
        </div>
      </fieldset>
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <Label htmlFor={`${id}-minor`}>{t("minor")}</Label>
          <p className="text-muted-foreground text-sm">{t("minorHint")}</p>
        </div>
        <Switch
          checked={kit.minor}
          disabled={update.isPending}
          id={`${id}-minor`}
          onCheckedChange={(minor) => update.mutate({ minor })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-notes`}>{t("notes")}</Label>
        <Textarea
          id={`${id}-notes`}
          maxLength={2000}
          onChange={(event) => setNotes(event.currentTarget.value)}
          placeholder={t("notesHint")}
          rows={3}
          value={notes}
        />
        <div className="flex items-center gap-3">
          <Button
            disabled={update.isPending || notes === (kit.notes ?? "")}
            onClick={() => update.mutate({ notes: notes.trim() || null })}
            size="sm"
            variant="outline"
          >
            {t("save")}
          </Button>
        </div>
      </div>
      {update.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
      <p className="flex items-start gap-2 text-muted-foreground text-xs">
        <ShieldCheckIcon aria-hidden="true" className="size-4 shrink-0" />
        {t("noScans")}
      </p>
    </Sheet>
  );
};

/** One card per document, with where the member stands with it. */
const DocumentsTab = ({
  documents,
  statuses,
}: {
  readonly documents: readonly TravelRequirement[];
  readonly statuses: ReadonlyMap<string, DocumentStatus>;
}) => {
  const t = useTranslations("app.travel.documents");
  const locale = useLocale() as Locale;
  const setStatus = useSetDocumentStatus();
  if (documents.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }
  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-sm">{t("shared")}</p>
      {setStatus.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
      <ul className="grid gap-3">
        {documents.map((document) => {
          const status = documentStatus(statuses, document.doc_key);
          const title = localized(document, "title", locale);
          return (
            <li key={document.id}>
              <Sheet className="grid gap-3">
                <RequirementText requirement={document} />
                {(document.copies ?? 0) > 0 ? (
                  <p className="flex items-center gap-1.5 text-sm">
                    <PrinterIcon
                      aria-hidden="true"
                      className="size-4 text-pink-text"
                    />
                    {t("copies", {
                      copies: formatNumber(document.copies ?? 0, locale),
                    })}
                  </p>
                ) : null}
                <Facts requirement={document} />
                <ToggleGroup
                  aria-label={t("statusLabel", { document: title })}
                  className="w-full flex-wrap"
                  disabled={setStatus.isPending}
                  onValueChange={(value) => {
                    if (document.doc_key && isDocumentStatus(value)) {
                      setStatus.mutate({
                        docKey: document.doc_key,
                        status: value,
                      });
                    }
                  }}
                  type="single"
                  value={status}
                  variant="outline"
                >
                  {documentStatuses.map((option) => (
                    <ToggleGroupItem
                      className={cn(
                        "min-h-11 flex-1",
                        option === "ready" &&
                          "data-[state=on]:bg-bulb-yellow data-[state=on]:text-on-yellow"
                      )}
                      key={option}
                      value={option}
                    >
                      {t(`status.${option}`)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Sheet>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/** The documents to print and how many copies of each. */
const PrintoutsTab = ({
  documents,
}: {
  readonly documents: readonly TravelRequirement[];
}) => {
  const t = useTranslations("app.travel.printouts");
  const locale = useLocale() as Locale;
  const { items, total } = printouts(documents);
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }
  return (
    <Sheet className="grid gap-4">
      <p className="text-muted-foreground text-sm">{t("intro")}</p>
      <ul className="divide-y">
        {items.map((document) => (
          <li
            className="flex min-h-11 items-center justify-between gap-3 py-2"
            key={document.id}
          >
            <span className="text-sm">
              {localized(document, "title", locale)}
            </span>
            <span className="shrink-0 font-mono text-sm">
              {t("copies", {
                copies: formatNumber(document.copies ?? 0, locale),
              })}
            </span>
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-2 border-t pt-3 font-semibold">
        <PrinterIcon aria-hidden="true" className="size-4 text-pink-text" />
        {t("total", { total: formatNumber(total, locale) })}
      </p>
    </Sheet>
  );
};

const STATE_BADGES = {
  done: { icon: CircleCheckIcon, variant: "success" },
  overdue: { icon: CircleAlertIcon, variant: "danger" },
  soon: { icon: ClockIcon, variant: "warning" },
} as const;

type BadgeState = keyof typeof STATE_BADGES;

const hasBadge = (state: ScheduleState): state is BadgeState =>
  state in STATE_BADGES;

/** The tasks and dated documents, worked backward from the member's dates. */
const ScheduleTab = ({
  kit,
  requirements,
  statuses,
  ticks,
}: {
  readonly kit: Kit;
  readonly requirements: readonly TravelRequirement[];
  readonly statuses: ReadonlyMap<string, DocumentStatus>;
  readonly ticks: ReadonlySet<string>;
}) => {
  const t = useTranslations("app.travel.schedule");
  const tDocuments = useTranslations("app.travel.documents");
  const locale = useLocale() as Locale;
  const tick = useTickKit(kit.id);
  const id = useId();
  const items = schedule({
    dates: kit,
    done: (requirement) =>
      requirement.kind === "document"
        ? documentStatus(statuses, requirement.doc_key) === "ready"
        : ticks.has(requirement.id),
    requirements,
    today: baghdadToday(),
  });
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  const when = (requirement: TravelRequirement, due: string | null) => {
    if (due) {
      return t("due", { date: formatCalendarDate(calendarDay(due), locale) });
    }
    if (requirement.anchor === "appointment") {
      return t("needsAppointment");
    }
    if (requirement.anchor === "departure") {
      return t("needsDeparture");
    }
    return t("anytime");
  };

  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-sm">{t("intro")}</p>
      {tick.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
      <ol className="grid gap-3">
        {items.map(({ due, requirement, state }) => {
          const badge = hasBadge(state)
            ? { ...STATE_BADGES[state], state }
            : null;
          const checkboxId = `${id}-${requirement.id}`;
          return (
            <li key={requirement.id}>
              <Sheet className="grid gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      "font-mono text-sm",
                      due ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {when(requirement, due)}
                  </p>
                  {badge ? (
                    <Badge variant={badge.variant}>
                      <badge.icon aria-hidden="true" />
                      {t(`states.${badge.state}`)}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-start gap-3">
                  {requirement.kind === "task" ? (
                    <Checkbox
                      aria-labelledby={`${checkboxId}-label`}
                      checked={ticks.has(requirement.id)}
                      className="mt-1"
                      disabled={tick.isPending}
                      id={checkboxId}
                      onCheckedChange={(checked) =>
                        tick.mutate({
                          done: checked === true,
                          requirementId: requirement.id,
                        })
                      }
                    />
                  ) : null}
                  <div className="grid flex-1 gap-1" id={`${checkboxId}-label`}>
                    <RequirementText requirement={requirement} />
                    {requirement.kind === "document" ? (
                      <p className="text-muted-foreground text-xs">
                        {t("documentStatus", {
                          status: tDocuments(
                            `status.${documentStatus(statuses, requirement.doc_key)}`
                          ),
                        })}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Facts requirement={requirement} />
              </Sheet>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

/** What to ask the embassy or the program before going, tickable. */
const QuestionsTab = ({
  kitId,
  questions,
  ticks,
}: {
  readonly kitId: string;
  readonly questions: readonly TravelRequirement[];
  readonly ticks: ReadonlySet<string>;
}) => {
  const t = useTranslations("app.travel.questions");
  const tick = useTickKit(kitId);
  const id = useId();
  if (questions.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }
  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-sm">{t("intro")}</p>
      {tick.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
      <ul className="grid gap-3">
        {questions.map((question) => {
          const checkboxId = `${id}-${question.id}`;
          return (
            <li key={question.id}>
              <Sheet className="grid gap-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    aria-labelledby={`${checkboxId}-label`}
                    checked={ticks.has(question.id)}
                    className="mt-1"
                    disabled={tick.isPending}
                    id={checkboxId}
                    onCheckedChange={(checked) =>
                      tick.mutate({
                        done: checked === true,
                        requirementId: question.id,
                      })
                    }
                  />
                  <div className="flex-1" id={`${checkboxId}-label`}>
                    <RequirementText requirement={question} />
                  </div>
                </div>
                <Facts requirement={question} />
              </Sheet>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/** Deleting the kit (document statuses stay, for the next trip). */
const DeleteKit = ({ kitId }: { readonly kitId: string }) => {
  const t = useTranslations("app.travel.kit");
  const router = useRouter();
  const remove = useDeleteKit();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="self-start" size="sm" variant="ghost">
          <Trash2Icon aria-hidden="true" />
          {t("delete")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {remove.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("failed")}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={remove.isPending}
            onClick={(event) => {
              event.preventDefault();
              remove.mutate(kitId, {
                onSuccess: () => router.push(kitsPath),
              });
            }}
          >
            {t("deleteConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/** The folder's lettered tabs, on paper sheets. */
const Folder = ({ kit }: { readonly kit: Kit }) => {
  const t = useTranslations("app.travel.kit");
  const requirements = useKitRequirements(kit.route_id, kit.opportunity_id);
  const statuses = useDocumentStatuses();
  const ticks = useKitTicks(kit.id);
  const [tab, setTab] = useState<KitTab>("documents");

  const failed = requirements.isError || statuses.isError || ticks.isError;
  const loaded = requirements.data && statuses.data && ticks.data;
  const applicable = applicableRequirements(requirements.data ?? [], kit.minor);
  const documents = kitDocuments(applicable);
  const statusMap = statuses.data ?? new Map<string, DocumentStatus>();
  const share = readyShare(documents, statusMap);
  const ready = Math.round(share * documents.length);

  let body: ReactNode = <SectionSpinner />;
  if (failed) {
    body = (
      <ErrorState
        onRetry={() => {
          requirements.refetch();
          statuses.refetch();
          ticks.refetch();
        }}
      />
    );
  } else if (loaded) {
    body = (
      <Tabs
        className="gap-0"
        onValueChange={(value) => setTab(value as KitTab)}
        value={tab}
      >
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0">
          {kitTabs.map((key) => (
            <TabsTrigger
              className="h-auto min-h-11 flex-none rounded-t-lg rounded-b-none border border-b-0 bg-idea-pink/10 px-3 text-foreground data-[state=active]:bg-surface-raised data-[state=active]:shadow-none"
              key={key}
              value={key}
            >
              <span
                aria-hidden="true"
                className="flex size-6 items-center justify-center rounded-full bg-idea-pink font-mono text-on-pink text-xs"
              >
                {t(`letters.${key}`)}
              </span>
              {t(`tabs.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="rounded-lg rounded-ss-none border bg-surface-sunken p-3 md:p-4">
          <TabsContent value="documents">
            <DocumentsTab documents={documents} statuses={statusMap} />
          </TabsContent>
          <TabsContent value="printouts">
            <PrintoutsTab documents={documents} />
          </TabsContent>
          <TabsContent value="schedule">
            <ScheduleTab
              kit={kit}
              requirements={applicable}
              statuses={statusMap}
              ticks={ticks.data}
            />
          </TabsContent>
          <TabsContent value="questions">
            <QuestionsTab
              kitId={kit.id}
              questions={openQuestions(applicable)}
              ticks={ticks.data}
            />
          </TabsContent>
        </div>
      </Tabs>
    );
  }

  return (
    <>
      <Cover kit={kit} ready={ready} share={share} total={documents.length} />
      <KitDetails kit={kit} />
      {body}
    </>
  );
};

/**
 * `/pass/travel/<kitId>`: a member's folder for one trip. The cover (the
 * route, the program, the bulb filling as documents get ready), the dates,
 * the under-18 switch and notes, then the lettered tabs: Documents,
 * Printouts, Schedule and Open questions. It never holds a document.
 */
export const KitFolder = ({ kitId }: { readonly kitId: string }) => {
  const t = useTranslations("app.travel.kit");
  const kit = useKit(kitId);

  let body: ReactNode = <SectionSpinner />;
  if (kit.isError) {
    body = <ErrorState onRetry={() => kit.refetch()} />;
  } else if (kit.data === null) {
    body = <p className="text-muted-foreground text-sm">{t("notFound")}</p>;
  } else if (kit.data) {
    body = <Folder kit={kit.data} />;
  }

  return (
    <div className="flex max-w-3xl flex-1 flex-col gap-6">
      <Link
        className="inline-flex min-h-11 items-center gap-2 self-start text-muted-foreground text-sm hover:text-foreground"
        href={kitsPath}
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t("back")}
      </Link>
      {body}
      {kit.data ? <DeleteKit kitId={kit.data.id} /> : null}
    </div>
  );
};
