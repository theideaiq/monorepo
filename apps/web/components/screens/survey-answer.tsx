"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { cn } from "@repo/design-system/lib/utils";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { ArrowLeftIcon, FlagIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useState } from "react";
import { RunBy } from "@/components/club/run-by";
import { SurveyResponseStatus } from "@/components/club/survey-response-status";
import { SurveySummaryPanel } from "@/components/club/survey-summary";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  useMyResponse,
  useReportSurvey,
  useStartSurvey,
  useSubmitSurvey,
  useSurvey,
  useSurveyDebrief,
  useWithdrawResponse,
} from "@/lib/survey-queries";
import {
  missingAnswers,
  type SurveyAnswers,
  type SurveyQuestion,
  surveyError,
  surveyMinutes,
} from "@/lib/surveys";

const SCALE = [1, 2, 3, 4, 5] as const;

type Answer = SurveyAnswers[string] | undefined;

/** One question, by kind. */
const QuestionField = ({
  index,
  missing,
  onChange,
  question,
  value,
}: {
  readonly index: number;
  readonly missing: boolean;
  readonly onChange: (value: Answer) => void;
  readonly question: SurveyQuestion & { id: string };
  readonly value: Answer;
}) => {
  const t = useTranslations("web.club.surveys.answer");
  const name = `q-${question.id}`;
  const legend = (
    <legend className="mb-2 font-medium">
      {index + 1}. {question.prompt}
      {question.required ? null : (
        <span className="ms-2 font-normal text-muted-foreground text-xs">
          {t("optional")}
        </span>
      )}
    </legend>
  );

  let field: ReactNode = null;
  if (question.kind === "single" || question.kind === "multiple") {
    const many = question.kind === "multiple";
    const chosen = Array.isArray(value) ? value : [];
    field = (
      <div className="grid gap-2">
        {question.options.map((option) => (
          <label className="flex items-center gap-2 text-sm" key={option}>
            <input
              checked={many ? chosen.includes(option) : value === option}
              className="size-4 accent-primary"
              name={name}
              onChange={(event) => {
                if (!many) {
                  onChange(option);
                  return;
                }
                onChange(
                  event.target.checked
                    ? [...chosen, option]
                    : chosen.filter((item) => item !== option)
                );
              }}
              type={many ? "checkbox" : "radio"}
              value={option}
            />
            {option}
          </label>
        ))}
      </div>
    );
  } else if (question.kind === "scale") {
    field = (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">{t("scaleLow")}</span>
        {SCALE.map((point) => (
          <Button
            aria-pressed={value === point}
            key={point}
            onClick={() => onChange(point)}
            size="sm"
            type="button"
            variant={value === point ? "default" : "outline"}
          >
            {String(point)}
          </Button>
        ))}
        <span className="text-muted-foreground text-xs">{t("scaleHigh")}</span>
      </div>
    );
  } else if (question.kind === "number") {
    field = (
      <Input
        aria-label={question.prompt}
        className="w-40"
        dir="ltr"
        inputMode="decimal"
        onChange={(event) =>
          onChange(
            event.target.value === "" ? undefined : Number(event.target.value)
          )
        }
        type="number"
        value={typeof value === "number" ? value : ""}
      />
    );
  } else {
    field = (
      <Textarea
        aria-label={question.prompt}
        maxLength={2000}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        value={typeof value === "string" ? value : ""}
      />
    );
  }

  return (
    <fieldset
      aria-invalid={missing || undefined}
      className={cn(
        "rounded-lg border p-4",
        missing ? "border-destructive" : null
      )}
    >
      {legend}
      {field}
      {missing ? (
        <p className="mt-2 text-destructive text-sm">{t("required")}</p>
      ) : null}
    </fieldset>
  );
};

/** "Report this survey": it goes back to our team's review. */
const ReportSurvey = ({ surveyId }: { readonly surveyId: string }) => {
  const t = useTranslations("web.club.surveys.report");
  const report = useReportSurvey();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (report.isSuccess) {
    return <p className="text-muted-foreground text-sm">{t("sent")}</p>;
  }
  if (!open) {
    return (
      <Button
        className="gap-2 self-start"
        onClick={() => setOpen(true)}
        size="sm"
        variant="ghost"
      >
        <FlagIcon aria-hidden="true" className="size-4" />
        {t("open")}
      </Button>
    );
  }
  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    report.mutate({ reason, target: surveyId });
  };
  return (
    <form className="grid gap-2" onSubmit={send}>
      <Label htmlFor="survey-report">{t("reason")}</Label>
      <Textarea
        id="survey-report"
        maxLength={500}
        onChange={(event) => setReason(event.target.value)}
        required
        rows={3}
        value={reason}
      />
      <div className="flex gap-2">
        <Button
          disabled={report.isPending || !reason.trim()}
          size="sm"
          type="submit"
        >
          {t("send")}
        </Button>
        <Button
          onClick={() => setOpen(false)}
          size="sm"
          type="button"
          variant="ghost"
        >
          {t("cancel")}
        </Button>
      </div>
      {report.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </form>
  );
};

const BackToClub = () => {
  const t = useTranslations("web.club.surveys");
  return (
    <Link
      className="inline-flex items-center gap-1 self-start text-muted-foreground text-sm hover:text-foreground"
      href="/club#yours"
    >
      <ArrowLeftIcon aria-hidden="true" className="size-4 rtl:rotate-180" />
      {t("back")}
    </Link>
  );
};

/**
 * /club/surveys/<id>: the consent, then the questions. Answers count when
 * they took the minimum time and passed the attention checks.
 */
export const SurveyAnswer = ({ surveyId }: { readonly surveyId: string }) => {
  const t = useTranslations("web.club.surveys.answer");
  const survey = useSurvey(surveyId);

  if (survey.isPending) {
    return <SectionSpinner />;
  }
  if (survey.isError) {
    return <ErrorState onRetry={() => survey.refetch()} />;
  }
  const { data } = survey;
  if (data?.status !== "open") {
    return (
      <div className="flex flex-col gap-4">
        <BackToClub />
        <p className="text-muted-foreground">{t("closed")}</p>
        <SurveyResponseStatus open={false} surveyId={surveyId} />
        <SurveySummaryPanel surveyId={surveyId} />
      </div>
    );
  }
  return <OpenSurvey survey={data} />;
};

/** After sending: whether the answers counted, what they earned, and the rest. */
const Thanks = ({
  deception,
  surveyId,
}: {
  readonly deception: boolean;
  readonly surveyId: string;
}) => {
  const t = useTranslations("web.club.surveys.answer");
  const debrief = useSurveyDebrief(surveyId, deception);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("thanks")} />
      {debrief.data ? (
        <section className="grid gap-2 rounded-lg border bg-surface-raised p-4">
          <h2 className="font-semibold">{t("debrief")}</h2>
          <p className="whitespace-pre-line text-sm">{debrief.data}</p>
        </section>
      ) : null}
      <SurveyResponseStatus open surveyId={surveyId} />
      <BackToClub />
    </div>
  );
};

/**
 * Before starting: the reward, the time it takes, that there are attention
 * checks, and the rules a response is counted by.
 */
const CountingRules = ({ survey }: { readonly survey: LoadedSurvey }) => {
  const t = useTranslations("web.club.surveys.answer.rules");
  const locale = useLocale() as Locale;
  const seconds = survey.median_seconds ?? survey.estimated_seconds ?? 0;
  const checks = survey.survey_questions.some(
    (question) => question.is_attention
  );
  return (
    <section className="grid gap-2 rounded-lg border p-4 text-sm">
      <h2 className="font-semibold">{t("title")}</h2>
      <ul className="grid list-disc gap-1 ps-5">
        {survey.kind === "free" ? (
          <li>{t("credit")}</li>
        ) : (
          <li>{t("reward", { bulbs: formatNumber(survey.reward, locale) })}</li>
        )}
        {seconds > 0 ? (
          <li>
            {t("time", {
              minutes: formatNumber(surveyMinutes(seconds), locale),
            })}
          </li>
        ) : null}
        {checks ? <li>{t("checks")}</li> : null}
        <li>{t("counts")}</li>
        <li>{t("quit")}</li>
        <li>{t("appeal")}</li>
      </ul>
    </section>
  );
};

type LoadedSurvey = NonNullable<ReturnType<typeof useSurvey>["data"]>;

/** Before starting: the rules, then "I agree, start" (unless it's yours or paused). */
const StartPanel = ({
  onStart,
  own,
  start,
  survey: data,
}: {
  readonly onStart: () => void;
  readonly own: boolean;
  readonly start: ReturnType<typeof useStartSurvey>;
  readonly survey: LoadedSurvey;
}) => {
  const t = useTranslations("web.club.surveys.answer");
  const tError = useTranslations("web.club.surveys.errors");
  const surveyId = data.id;
  const questions = data.survey_questions;
  const paused = Boolean(data.paused_at);
  return (
    <div className="grid gap-3">
      <CountingRules survey={data} />
      <p className="text-muted-foreground text-sm">
        {t("anonymous", { n: String(questions.length) })}{" "}
        <Link className="text-pink-text underline" href="/legal/surveys">
          {t("terms")}
        </Link>
      </p>
      {own ? (
        <p className="text-sm">
          {t("yours")}{" "}
          <Link
            className="text-pink-text underline"
            href={`/club/surveys/${encodeURIComponent(surveyId)}/results`}
          >
            {t("results")}
          </Link>
        </p>
      ) : null}
      {!own && paused ? (
        <p className="text-muted-foreground text-sm">{t("paused")}</p>
      ) : null}
      {own || paused ? null : (
        <Button
          className="justify-self-start"
          disabled={start.isPending}
          onClick={onStart}
        >
          {t("agree")}
        </Button>
      )}
      {start.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {tError(surveyError(start.error.message))}
        </p>
      ) : null}
    </div>
  );
};

/** An open survey: the consent, then the questions, then the thanks. */
const OpenSurvey = ({ survey: data }: { readonly survey: LoadedSurvey }) => {
  const t = useTranslations("web.club.surveys.answer");
  const tError = useTranslations("web.club.surveys.errors");
  const { user } = useAuth();
  const start = useStartSurvey();
  const submit = useSubmitSurvey();
  const quit = useWithdrawResponse();
  const mine = useMyResponse(data.id);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [missing, setMissing] = useState<string[]>([]);
  const surveyId = data.id;
  const questions = data.survey_questions;
  const own = data.creator_id === user?.id;

  if (submit.isSuccess || mine.data?.submitted_at) {
    return <Thanks deception={data.deception} surveyId={surveyId} />;
  }

  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const gaps = missingAnswers(questions, answers).map((q) => q.id ?? "");
    setMissing(gaps);
    if (gaps.length === 0) {
      submit.mutate({ answers, target: surveyId });
    }
  };
  const setAnswer = (id: string, value: Answer) => {
    setMissing((current) => current.filter((item) => item !== id));
    setAnswers((current) => {
      const next = { ...current };
      if (value === undefined) {
        delete next[id];
      } else {
        next[id] = value;
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <BackToClub />
      <div
        className="flex flex-col gap-6"
        dir={data.language === "ar" ? "rtl" : "ltr"}
        lang={data.language}
      >
        <PageHeader title={data.title} />
        <RunBy purpose={data.purpose} runBy={data.run_by} />
        {data.description ? (
          <p className="whitespace-pre-line text-muted-foreground">
            {data.description}
          </p>
        ) : null}
        {start.isSuccess ? (
          <form className="grid gap-4" noValidate onSubmit={send}>
            {questions.map((question, index) => (
              <QuestionField
                index={index}
                key={question.id}
                missing={missing.includes(question.id)}
                onChange={(value) => setAnswer(question.id, value)}
                question={question}
                value={answers[question.id]}
              />
            ))}
            <div className="flex flex-wrap gap-2">
              <Button disabled={submit.isPending} type="submit">
                {submit.isPending ? t("sending") : t("submit")}
              </Button>
              <Button
                disabled={quit.isPending}
                onClick={() =>
                  quit.mutate(surveyId, { onSuccess: () => start.reset() })
                }
                type="button"
                variant="ghost"
              >
                {t("quit")}
              </Button>
            </div>
            {submit.isError ? (
              <p className="text-destructive text-sm" role="alert">
                {tError(surveyError(submit.error.message))}
              </p>
            ) : null}
          </form>
        ) : (
          <section className="grid gap-3 rounded-lg border bg-surface-raised p-4">
            <h2 className="font-semibold">{t("consent")}</h2>
            <p className="whitespace-pre-line text-sm">{data.consent}</p>
            {data.ethics_reference ? (
              <p className="text-muted-foreground text-xs">
                {t("ethics", { reference: data.ethics_reference })}
              </p>
            ) : null}
          </section>
        )}
      </div>
      {start.isSuccess ? null : (
        <StartPanel
          onStart={() => start.mutate(surveyId)}
          own={own}
          start={start}
          survey={data}
        />
      )}
      {own ? null : <ReportSurvey surveyId={surveyId} />}
    </div>
  );
};
