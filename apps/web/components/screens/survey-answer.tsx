"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { cn } from "@repo/design-system/lib/utils";
import { Link } from "@repo/internationalization/navigation";
import { ArrowLeftIcon, FlagIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  useReportSurvey,
  useStartSurvey,
  useSubmitSurvey,
  useSurvey,
} from "@/lib/survey-queries";
import {
  missingAnswers,
  type SurveyAnswers,
  type SurveyQuestion,
  surveyError,
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
      </div>
    );
  }
  return <OpenSurvey survey={data} />;
};

/** After sending: whether the answers counted, and what they earned. */
const Thanks = ({
  counted,
  reward,
}: {
  readonly counted: boolean;
  readonly reward: number;
}) => {
  const t = useTranslations("web.club.surveys.answer");
  let thanks = t("notCounted");
  if (counted) {
    thanks =
      reward > 0
        ? t("thanksReward", { bulbs: String(reward) })
        : t("thanksCredit");
  }
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("thanks")} />
      <p>{thanks}</p>
      <BackToClub />
    </div>
  );
};

type LoadedSurvey = NonNullable<ReturnType<typeof useSurvey>["data"]>;

/** An open survey: the consent, then the questions, then the thanks. */
const OpenSurvey = ({ survey: data }: { readonly survey: LoadedSurvey }) => {
  const t = useTranslations("web.club.surveys.answer");
  const tError = useTranslations("web.club.surveys.errors");
  const { user } = useAuth();
  const start = useStartSurvey();
  const submit = useSubmitSurvey();
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [missing, setMissing] = useState<string[]>([]);
  const surveyId = data.id;
  const questions = data.survey_questions;
  const own = data.creator_id === user?.id;

  if (submit.isSuccess) {
    return (
      <Thanks counted={Boolean(submit.data?.counted)} reward={data.reward} />
    );
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
            <Button
              className="justify-self-start"
              disabled={submit.isPending}
              type="submit"
            >
              {submit.isPending ? t("sending") : t("submit")}
            </Button>
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
        <div className="grid gap-2">
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
          ) : (
            <Button
              className="justify-self-start"
              disabled={start.isPending}
              onClick={() => start.mutate(surveyId)}
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
      )}
      {own ? null : <ReportSurvey surveyId={surveyId} />}
    </div>
  );
};
