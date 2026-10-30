"use client";

import { formatPrice, governorates, localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { formatNumber } from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useId, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { useMyStudent, useUniversities } from "@/lib/student-queries";
import {
  type SurveyDraft,
  useDraftPrivate,
  useSaveSurvey,
  useSurvey,
} from "@/lib/survey-queries";
import {
  KEEP_MONTHS,
  QUOTA_FIELDS,
  type QuotaField,
  SURVEY_PURPOSES,
  type SurveyKind,
  type SurveyPurpose,
  type SurveyQuestion,
  surveyCost,
  surveyError,
  surveyEstimate,
  surveyMinutes,
  surveyReward,
} from "@/lib/surveys";

const QUESTION_KINDS = [
  "single",
  "multiple",
  "scale",
  "text",
  "number",
] as const;
const SURVEY_KINDS = ["free", "boosted"] as const;
const YEARS = [1, 2, 3, 4, 5, 6, 7] as const;

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs";

const blankQuestion = (): SurveyQuestion => ({
  attention_answer: null,
  kind: "single",
  options: ["", ""],
  prompt: "",
  required: true,
});

const emptyDraft = (locale: string): SurveyDraft => ({
  consent: "",
  debrief: "",
  deception: false,
  description: "",
  ethics_reference: "",
  governorates: [],
  keep_months: KEEP_MONTHS.default,
  kind: "free",
  language: locale === "en" ? "en" : "ar",
  majors: [],
  min_seconds: 60,
  purpose: "",
  questions: [blankQuestion()],
  run_by: "",
  share_summary: true,
  students_only: false,
  title: "",
  universities: [],
  wanted: 50,
  years: [],
});

const toggle = <T,>(list: readonly T[], value: T, on: boolean) =>
  on ? [...list, value] : list.filter((item) => item !== value);

/** A row of checkboxes for a targeting list. */
const CheckList = <T extends number | string>({
  items,
  label,
  onChange,
  value,
}: {
  readonly items: readonly { id: T; name: string }[];
  readonly label: string;
  readonly onChange: (value: T[]) => void;
  readonly value: readonly T[];
}) => (
  <fieldset className="grid gap-2">
    <legend className="mb-1 font-medium text-sm">{label}</legend>
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {items.map((item) => (
        <label className="flex items-center gap-2 text-sm" key={item.id}>
          <input
            checked={value.includes(item.id)}
            className="size-4 accent-primary"
            onChange={(event) =>
              onChange(toggle(value, item.id, event.target.checked))
            }
            type="checkbox"
          />
          {item.name}
        </label>
      ))}
    </div>
  </fieldset>
);

/** One question in the editor. */
const QuestionEditor = ({
  count,
  index,
  onChange,
  onMove,
  onRemove,
  question,
}: {
  readonly count: number;
  readonly index: number;
  readonly onChange: (question: SurveyQuestion) => void;
  readonly onMove: (by: -1 | 1) => void;
  readonly onRemove: () => void;
  readonly question: SurveyQuestion;
}) => {
  const t = useTranslations("web.club.surveys.builder");
  const id = useId();
  const choice = question.kind === "single" || question.kind === "multiple";
  const options = question.options.filter((option) => option.trim());

  return (
    <div className="grid gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm">
          {t("question", { n: String(index + 1) })}
        </span>
        <div className="flex gap-1">
          <Button
            aria-label={t("moveUp")}
            disabled={index === 0}
            onClick={() => onMove(-1)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ArrowUpIcon aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label={t("moveDown")}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ArrowDownIcon aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label={t("remove")}
            disabled={count === 1}
            onClick={onRemove}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2Icon aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-prompt`}>{t("prompt")}</Label>
          <Input
            id={`${id}-prompt`}
            maxLength={500}
            onChange={(event) =>
              onChange({ ...question, prompt: event.target.value })
            }
            value={question.prompt}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-kind`}>{t("kind")}</Label>
          <select
            className={selectClassName}
            id={`${id}-kind`}
            onChange={(event) =>
              onChange({
                ...question,
                attention_answer: null,
                kind: event.target.value as SurveyQuestion["kind"],
              })
            }
            value={question.kind}
          >
            {QUESTION_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t(`kinds.${kind}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {choice ? (
        <div className="grid gap-2">
          <Label htmlFor={`${id}-options`}>{t("options")}</Label>
          <Textarea
            id={`${id}-options`}
            onChange={(event) =>
              onChange({ ...question, options: event.target.value.split("\n") })
            }
            rows={Math.max(3, question.options.length)}
            value={question.options.join("\n")}
          />
          <p className="text-muted-foreground text-xs">{t("optionsNote")}</p>
        </div>
      ) : null}
      {question.kind === "text" ? (
        <p className="text-muted-foreground text-xs">{t("textWarning")}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={question.required}
            className="size-4 accent-primary"
            onChange={(event) =>
              onChange({ ...question, required: event.target.checked })
            }
            type="checkbox"
          />
          {t("required")}
        </label>
        {question.kind === "single" && options.length > 1 ? (
          <div className="flex items-center gap-2">
            <Label htmlFor={`${id}-attention`}>{t("attention")}</Label>
            <select
              className={`${selectClassName} w-auto`}
              id={`${id}-attention`}
              onChange={(event) =>
                onChange({
                  ...question,
                  attention_answer: event.target.value || null,
                })
              }
              value={question.attention_answer ?? ""}
            >
              <option value="">{t("noAttention")}</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const Field = ({
  children,
  htmlFor,
  label,
  note,
}: {
  readonly children: ReactNode;
  readonly htmlFor: string;
  readonly label: string;
  readonly note?: string;
}) => (
  <div className="grid gap-2">
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
    {note ? <p className="text-muted-foreground text-xs">{note}</p> : null}
  </div>
);

/**
 * Quotas: the largest share of the responses from any one university,
 * major, year or governorate (empty for no cap). Never sensitive fields.
 */
const QuotaFields = ({
  onChange,
  quotas,
}: {
  readonly onChange: (quotas: NonNullable<SurveyDraft["quotas"]>) => void;
  readonly quotas: NonNullable<SurveyDraft["quotas"]>;
}) => {
  const t = useTranslations("web.club.surveys.builder.quotas");
  const id = useId();
  const setShare = (field: QuotaField, value: string) => {
    const next = { ...quotas };
    const share = Number(value);
    if (value === "" || !Number.isFinite(share) || share <= 0) {
      delete next[field];
    } else {
      next[field] = Math.min(100, Math.round(share));
    }
    onChange(next);
  };
  return (
    <fieldset className="grid gap-3">
      <legend className="font-medium text-sm">{t("title")}</legend>
      <p className="text-muted-foreground text-xs">{t("note")}</p>
      <div className="grid gap-3 sm:grid-cols-4">
        {QUOTA_FIELDS.map((field) => (
          <Field
            htmlFor={`${id}-${field}`}
            key={field}
            label={t(`fields.${field}`)}
          >
            <Input
              dir="ltr"
              id={`${id}-${field}`}
              max={100}
              min={1}
              onChange={(event) => setShare(field, event.target.value)}
              placeholder={t("none")}
              type="number"
              value={quotas[field] ?? ""}
            />
          </Field>
        ))}
      </div>
    </fieldset>
  );
};

/**
 * The summary for respondents (off only for academic surveys), deception
 * studies with their debrief, and how long the answers are kept; the last
 * two need the ethics reference.
 */
const ResearchFields = ({
  draft,
  set,
}: {
  readonly draft: SurveyDraft;
  readonly set: <K extends keyof SurveyDraft>(
    key: K,
    value: SurveyDraft[K]
  ) => void;
}) => {
  const t = useTranslations("web.club.surveys.builder.research");
  const id = useId();
  const academic = draft.purpose === "academic";
  const ethics = draft.ethics_reference.trim().length > 0;
  return (
    <section className="grid gap-4">
      <h2 className="font-semibold text-lg">{t("title")}</h2>
      <label className="flex items-start gap-2 text-sm">
        <input
          checked={draft.share_summary || !academic}
          className="mt-0.5 size-4 accent-primary"
          disabled={!academic}
          onChange={(event) => set("share_summary", event.target.checked)}
          type="checkbox"
        />
        <span>
          {t("summary")}
          <span className="block text-muted-foreground text-xs">
            {t("summaryNote")}
          </span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          checked={draft.deception && ethics}
          className="mt-0.5 size-4 accent-primary"
          disabled={!ethics}
          onChange={(event) => set("deception", event.target.checked)}
          type="checkbox"
        />
        <span>
          {t("deception")}
          <span className="block text-muted-foreground text-xs">
            {t("deceptionNote")}
          </span>
        </span>
      </label>
      {draft.deception && ethics ? (
        <Field
          htmlFor={`${id}-debrief`}
          label={t("debrief")}
          note={t("debriefNote")}
        >
          <Textarea
            id={`${id}-debrief`}
            maxLength={3000}
            onChange={(event) => set("debrief", event.target.value)}
            rows={4}
            value={draft.debrief}
          />
        </Field>
      ) : null}
      <Field
        htmlFor={`${id}-keep`}
        label={t("keep")}
        note={ethics ? t("keepNote") : t("keepEthics")}
      >
        <Input
          dir="ltr"
          disabled={!ethics}
          id={`${id}-keep`}
          max={KEEP_MONTHS.max}
          min={KEEP_MONTHS.default}
          onChange={(event) =>
            set(
              "keep_months",
              Math.min(
                KEEP_MONTHS.max,
                Math.max(
                  KEEP_MONTHS.default,
                  Number(event.target.value) || KEEP_MONTHS.default
                )
              )
            )
          }
          type="number"
          value={ethics ? draft.keep_months : KEEP_MONTHS.default}
        />
      </Field>
    </section>
  );
};

/** What the respondents get and what it costs the creator. */
const RewardNote = ({ draft }: { readonly draft: SurveyDraft }) => {
  const t = useTranslations("web.club.surveys.builder");
  const locale = useLocale();
  const seconds = surveyEstimate(draft.questions);
  const reward = surveyReward(seconds);
  const cost = surveyCost(reward, draft.wanted);
  const minutes = formatNumber(surveyMinutes(seconds), locale);
  if (draft.kind === "free") {
    return (
      <p className="text-muted-foreground text-sm">
        {t("freeNote")} {t("estimate", { minutes })}
      </p>
    );
  }
  return (
    <div className="grid gap-1 text-muted-foreground text-sm">
      <p>
        {t("boostedNote", {
          bulbs: formatNumber(reward, locale),
          cost: formatPrice(cost, locale),
          minutes,
        })}
      </p>
      <p>{t("boostedMedian")}</p>
    </div>
  );
};

/** The form itself, from a new or saved draft. */
const BuilderForm = ({ initial }: { readonly initial: SurveyDraft }) => {
  const t = useTranslations("web.club.surveys.builder");
  const tError = useTranslations("web.club.surveys.errors");
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const universities = useUniversities();
  const save = useSaveSurvey();
  const [draft, setDraft] = useState(initial);
  const [majors, setMajors] = useState(initial.majors.join(", "));
  const [invalid, setInvalid] = useState(false);

  const set = <K extends keyof SurveyDraft>(key: K, value: SurveyDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const setQuestion = (index: number, question: SurveyQuestion) =>
    set(
      "questions",
      draft.questions.map((item, place) => (place === index ? question : item))
    );
  const move = (index: number, by: -1 | 1) => {
    const next = [...draft.questions];
    const [item] = next.splice(index, 1);
    if (item) {
      next.splice(index + by, 0, item);
    }
    set("questions", next);
  };

  const submit = (publish: boolean) => {
    const body: SurveyDraft = {
      ...draft,
      majors: majors
        .split(",")
        .map((major) => major.trim())
        .filter(Boolean),
      questions: draft.questions.map((question) => ({
        ...question,
        options:
          question.kind === "single" || question.kind === "multiple"
            ? question.options.map((option) => option.trim()).filter(Boolean)
            : [],
      })),
    };
    const blank =
      body.title.trim().length < 3 ||
      (publish && !(body.run_by.trim() && body.purpose)) ||
      body.questions.some((question) => !question.prompt.trim());
    setInvalid(blank);
    if (blank) {
      return;
    }
    save.mutate(
      { draft: body, publish },
      {
        onSuccess: (saved) => {
          if (!saved) {
            return;
          }
          router.replace(
            publish
              ? `/club/surveys/${encodeURIComponent(saved.id)}/results`
              : `/club/surveys/new?edit=${encodeURIComponent(saved.id)}`
          );
          setDraft((current) => ({ ...current, id: saved.id }));
        },
      }
    );
  };

  return (
    <form
      className="grid gap-8"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit(true);
      }}
    >
      <section className="grid gap-4">
        <h2 className="font-semibold text-lg">{t("about")}</h2>
        <Field htmlFor={`${id}-title`} label={t("title")}>
          <Input
            aria-invalid={
              (invalid && draft.title.trim().length < 3) || undefined
            }
            id={`${id}-title`}
            maxLength={160}
            onChange={(event) => set("title", event.target.value)}
            value={draft.title}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            htmlFor={`${id}-run-by`}
            label={t("runBy")}
            note={t("runByNote")}
          >
            <Input
              aria-invalid={(invalid && !draft.run_by.trim()) || undefined}
              id={`${id}-run-by`}
              maxLength={120}
              onChange={(event) => set("run_by", event.target.value)}
              value={draft.run_by}
            />
          </Field>
          <Field htmlFor={`${id}-purpose`} label={t("purpose")}>
            <select
              aria-invalid={(invalid && !draft.purpose) || undefined}
              className={selectClassName}
              id={`${id}-purpose`}
              onChange={(event) =>
                set("purpose", event.target.value as SurveyPurpose | "")
              }
              value={draft.purpose}
            >
              <option value="">{t("purposeChoose")}</option>
              {SURVEY_PURPOSES.map((purpose) => (
                <option key={purpose} value={purpose}>
                  {t(`purposes.${purpose}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field htmlFor={`${id}-description`} label={t("description")}>
          <Textarea
            id={`${id}-description`}
            maxLength={2000}
            onChange={(event) => set("description", event.target.value)}
            rows={3}
            value={draft.description}
          />
        </Field>
        <Field
          htmlFor={`${id}-consent`}
          label={t("consent")}
          note={t("consentNote")}
        >
          <Textarea
            id={`${id}-consent`}
            maxLength={3000}
            onChange={(event) => set("consent", event.target.value)}
            rows={4}
            value={draft.consent}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor={`${id}-language`} label={t("language")}>
            <select
              className={selectClassName}
              id={`${id}-language`}
              onChange={(event) =>
                set("language", event.target.value as SurveyDraft["language"])
              }
              value={draft.language}
            >
              <option value="ar">{t("arabic")}</option>
              <option value="en">{t("english")}</option>
            </select>
          </Field>
          <Field
            htmlFor={`${id}-ethics`}
            label={t("ethics")}
            note={t("ethicsNote")}
          >
            <Input
              id={`${id}-ethics`}
              maxLength={200}
              onChange={(event) => set("ethics_reference", event.target.value)}
              value={draft.ethics_reference}
            />
          </Field>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="font-semibold text-lg">{t("questions")}</h2>
        {draft.questions.map((question, index) => (
          <QuestionEditor
            count={draft.questions.length}
            index={index}
            // biome-ignore lint/suspicious/noArrayIndexKey: questions have no id until saved, and the editor's state is all in props
            key={index}
            onChange={(next) => setQuestion(index, next)}
            onMove={(by) => move(index, by)}
            onRemove={() =>
              set(
                "questions",
                draft.questions.filter((_, place) => place !== index)
              )
            }
            question={question}
          />
        ))}
        <Button
          className="gap-2 justify-self-start"
          disabled={draft.questions.length >= 60}
          onClick={() =>
            set("questions", [...draft.questions, blankQuestion()])
          }
          type="button"
          variant="outline"
        >
          <PlusIcon aria-hidden="true" className="size-4" />
          {t("addQuestion")}
        </Button>
      </section>

      <section className="grid gap-4">
        <h2 className="font-semibold text-lg">{t("who")}</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={draft.students_only}
            className="size-4 accent-primary"
            onChange={(event) => set("students_only", event.target.checked)}
            type="checkbox"
          />
          {t("studentsOnly")}
        </label>
        <CheckList
          items={(universities.data ?? []).map((row) => ({
            id: row.id,
            name: localized(row, "name", locale),
          }))}
          label={t("universities")}
          onChange={(value) => set("universities", value)}
          value={draft.universities}
        />
        <CheckList
          items={YEARS.map((year) => ({
            id: year,
            name: t("year", { n: String(year) }),
          }))}
          label={t("years")}
          onChange={(value) => set("years", value)}
          value={draft.years}
        />
        <CheckList
          items={governorates.map((governorate) => ({
            id: governorate.id,
            name: locale === "en" ? governorate.en : governorate.ar,
          }))}
          label={t("governorates")}
          onChange={(value) => set("governorates", value)}
          value={draft.governorates}
        />
        <Field
          htmlFor={`${id}-majors`}
          label={t("majors")}
          note={t("majorsNote")}
        >
          <Input
            id={`${id}-majors`}
            onChange={(event) => setMajors(event.target.value)}
            value={majors}
          />
        </Field>
        <p className="text-muted-foreground text-xs">{t("targetNote")}</p>
        <QuotaFields
          onChange={(quotas) => set("quotas", quotas)}
          quotas={draft.quotas ?? {}}
        />
      </section>

      <ResearchFields draft={draft} set={set} />

      <section className="grid gap-4">
        <h2 className="font-semibold text-lg">{t("rewards")}</h2>
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">{t("rewards")}</legend>
          {SURVEY_KINDS.map((kind: SurveyKind) => (
            <Button
              aria-pressed={draft.kind === kind}
              key={kind}
              onClick={() => set("kind", kind)}
              size="sm"
              type="button"
              variant={draft.kind === kind ? "default" : "outline"}
            >
              {t(`surveyKinds.${kind}`)}
            </Button>
          ))}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor={`${id}-wanted`} label={t("wanted")}>
            <Input
              dir="ltr"
              id={`${id}-wanted`}
              max={2000}
              min={1}
              onChange={(event) =>
                set(
                  "wanted",
                  Math.min(2000, Math.max(1, Number(event.target.value) || 1))
                )
              }
              type="number"
              value={draft.wanted}
            />
          </Field>
          <Field
            htmlFor={`${id}-seconds`}
            label={t("minSeconds")}
            note={t("minSecondsNote")}
          >
            <Input
              dir="ltr"
              id={`${id}-seconds`}
              max={3600}
              min={0}
              onChange={(event) =>
                set(
                  "min_seconds",
                  Math.min(3600, Math.max(0, Number(event.target.value) || 0))
                )
              }
              type="number"
              value={draft.min_seconds}
            />
          </Field>
        </div>
        <RewardNote draft={draft} />
      </section>

      <div className="grid gap-3">
        <p className="text-muted-foreground text-sm">{t("creatorRules")}</p>
        <p className="text-muted-foreground text-sm">
          {t("reviewNote")}{" "}
          <Link className="text-pink-text underline" href="/legal/surveys">
            {t("rules")}
          </Link>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={save.isPending} type="submit">
            {t("publish")}
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() => submit(false)}
            type="button"
            variant="outline"
          >
            {t("saveDraft")}
          </Button>
        </div>
        {invalid ? (
          <p className="text-destructive text-sm" role="alert">
            {t("incomplete")}
          </p>
        ) : null}
        {save.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {tError(surveyError(save.error.message))}
          </p>
        ) : null}
        {save.isSuccess && !save.isPending ? (
          <p className="text-muted-foreground text-sm" role="status">
            {t("saved")}
          </p>
        ) : null}
      </div>
    </form>
  );
};

/** A saved draft, loaded into the form. */
const EditDraft = ({ surveyId }: { readonly surveyId: string }) => {
  const t = useTranslations("web.club.surveys.builder");
  const survey = useSurvey(surveyId);
  const hidden = useDraftPrivate(surveyId);
  if (survey.isPending || hidden.isPending) {
    return <SectionSpinner />;
  }
  if (survey.isError || hidden.isError) {
    return (
      <ErrorState
        onRetry={() => Promise.all([survey.refetch(), hidden.refetch()])}
      />
    );
  }
  const { data } = survey;
  if (data?.status !== "draft") {
    return <p className="text-muted-foreground">{t("notDraft")}</p>;
  }
  return (
    <BuilderForm
      initial={{
        consent: data.consent,
        debrief: hidden.data.debrief,
        deception: data.deception,
        description: data.description,
        ethics_reference: data.ethics_reference ?? "",
        governorates: data.governorates,
        id: data.id,
        keep_months: data.keep_months,
        kind: data.kind as SurveyKind,
        language: data.language === "en" ? "en" : "ar",
        majors: data.majors,
        min_seconds: data.min_seconds,
        purpose: (data.purpose ?? "") as SurveyPurpose | "",
        questions: data.survey_questions.map((question) => ({
          attention_answer: hidden.data.attention.get(question.id) ?? null,
          kind: question.kind,
          options: question.options,
          prompt: question.prompt,
          required: question.required,
        })),
        quotas: (data.quotas ?? {}) as SurveyDraft["quotas"],
        run_by: data.run_by ?? "",
        share_summary: data.share_summary,
        students_only: data.students_only,
        title: data.title,
        universities: data.universities,
        wanted: data.wanted,
        years: data.years,
      }}
      key={data.id}
    />
  );
};

/** /club/surveys/new (?edit=<id> for a draft): verified students only. */
export const SurveyBuilder = () => {
  const t = useTranslations("web.club.surveys.builder");
  const tSurveys = useTranslations("web.club.surveys");
  const locale = useLocale();
  const params = useSearchParams();
  const edit = params.get("edit");
  const student = useMyStudent();

  let body: ReactNode = <SectionSpinner />;
  if (student.isError) {
    body = <ErrorState onRetry={() => student.refetch()} />;
  } else if (student.isSuccess && !student.data?.verified) {
    body = (
      <p className="text-muted-foreground">
        {tSurveys("studentsCreate")}{" "}
        <Link className="text-pink-text underline" href="/verify?kind=student">
          {tSurveys("verify")}
        </Link>
      </p>
    );
  } else if (student.isSuccess) {
    body = edit ? (
      <EditDraft surveyId={edit} />
    ) : (
      <BuilderForm initial={emptyDraft(locale)} />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        className="inline-flex items-center gap-1 self-start text-muted-foreground text-sm hover:text-foreground"
        href="/pass/applications?tab=surveys"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4 rtl:rotate-180" />
        {tSurveys("backToYours")}
      </Link>
      <PageHeader title={edit ? t("editTitle") : t("newTitle")} />
      {body}
    </div>
  );
};
