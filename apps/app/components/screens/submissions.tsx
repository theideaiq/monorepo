"use client";

import type { SubmissionStatus, SubmissionType } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@repo/design-system/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { formatDate } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  canWithdraw,
  FILE_TYPES,
  IMAGE_TYPES,
  type SubmissionDraft,
  type SubmissionProblem,
  submissionTypes,
  useMySubmissions,
  useSubmitWork,
  useWithdrawSubmission,
  validateSubmission,
} from "@/lib/community-queries";

const STATUS_BADGE: Record<
  SubmissionStatus,
  "default" | "destructive" | "outline" | "secondary"
> = {
  accepted: "default",
  pending: "secondary",
  rejected: "outline",
  revisions_requested: "destructive",
  under_review: "secondary",
  withdrawn: "outline",
};

const emptyDraft = (): SubmissionDraft => ({
  body: "",
  file: null,
  format: "text",
  title: "",
  type: "essay",
});

const SubmitForm = () => {
  const t = useTranslations("app.submissions");
  const tType = useTranslations("store.submissionType");
  const id = useId();
  const [fileKey, setFileKey] = useState(0);
  const submit = useSubmitWork();
  const [draft, setDraft] = useState<SubmissionDraft>(emptyDraft);
  const [problem, setProblem] = useState<SubmissionProblem | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const visualArt = draft.type === "visual_art";
  const withFile = visualArt || draft.format === "file";

  const update = (patch: Partial<SubmissionDraft>) => {
    setSubmitted(false);
    setDraft((current) => ({ ...current, ...patch }));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validateSubmission(draft);
    setProblem(found);
    if (found) {
      return;
    }
    submit.mutate(draft, {
      onSuccess: () => {
        setDraft(emptyDraft());
        setSubmitted(true);
        // A new file input: browsers don't let scripts clear the old one.
        setFileKey((current) => current + 1);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("form.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" noValidate onSubmit={onSubmit}>
          <fieldset className="grid gap-4" disabled={submit.isPending}>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-title`}>{t("form.workTitle")}</Label>
              <Input
                id={`${id}-title`}
                maxLength={300}
                onChange={(event) => update({ title: event.target.value })}
                value={draft.title}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-type`}>{t("form.type")}</Label>
              <Select
                onValueChange={(value) =>
                  update({ type: value as SubmissionType })
                }
                value={draft.type}
              >
                <SelectTrigger className="w-full" id={`${id}-type`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {submissionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {tType(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {visualArt ? null : (
              <fieldset className="grid gap-2">
                <legend className="mb-2 font-medium text-sm">
                  {t("form.format")}
                </legend>
                <RadioGroup
                  className="flex flex-wrap gap-6"
                  onValueChange={(value) =>
                    update({ format: value === "file" ? "file" : "text" })
                  }
                  value={draft.format}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id={`${id}-text`} value="text" />
                    <Label htmlFor={`${id}-text`}>{t("form.formatText")}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id={`${id}-file`} value="file" />
                    <Label htmlFor={`${id}-file`}>{t("form.formatFile")}</Label>
                  </div>
                </RadioGroup>
              </fieldset>
            )}
            {withFile ? (
              <div className="grid gap-2">
                <Label htmlFor={`${id}-upload`}>{t("form.file")}</Label>
                <Input
                  accept={(visualArt ? IMAGE_TYPES : FILE_TYPES).join(",")}
                  id={`${id}-upload`}
                  key={fileKey}
                  onChange={(event) =>
                    update({ file: event.target.files?.[0] ?? null })
                  }
                  type="file"
                />
                <p className="text-muted-foreground text-xs">
                  {visualArt ? t("form.imageHint") : t("form.fileHint")}
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor={`${id}-body`}>{t("form.body")}</Label>
                <Textarea
                  className="min-h-48"
                  id={`${id}-body`}
                  maxLength={200_000}
                  onChange={(event) => update({ body: event.target.value })}
                  value={draft.body}
                />
                <p className="text-muted-foreground text-xs">
                  {t("form.bodyHint")}
                </p>
              </div>
            )}
          </fieldset>
          {problem ? (
            <p className="text-destructive text-sm" role="alert">
              {t(`problems.${problem}`)}
            </p>
          ) : null}
          {submit.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {t("form.failed")}
            </p>
          ) : null}
          {submitted ? (
            <p className="text-sm text-success" role="status">
              {t("form.submitted")}
            </p>
          ) : null}
          <Button
            className="justify-self-start"
            disabled={submit.isPending}
            type="submit"
          >
            {submit.isPending ? t("form.submitting") : t("form.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const MySubmissions = () => {
  const t = useTranslations("app.submissions.list");
  const tStore = useTranslations("store");
  const locale = useLocale();
  const submissions = useMySubmissions();
  const withdraw = useWithdrawSubmission();

  return (
    <section className="grid gap-4">
      <h2 className="font-semibold text-lg">{t("title")}</h2>
      {submissions.isPending ? <SectionSpinner /> : null}
      {submissions.isError ? (
        <ErrorState onRetry={() => submissions.refetch()} />
      ) : null}
      {submissions.data?.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : null}
      {submissions.data?.length ? (
        <ul className="divide-y rounded-lg border">
          {submissions.data.map((submission) => (
            <li className="grid gap-2 p-4" key={submission.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid min-w-0 gap-1">
                  <span className="font-medium">{submission.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {tStore(`submissionType.${submission.type}`)} ·{" "}
                    {t("submittedOn", {
                      date: formatDate(submission.submitted_at, locale),
                    })}
                  </span>
                </div>
                <Badge variant={STATUS_BADGE[submission.status]}>
                  {tStore(`submissionStatus.${submission.status}`)}
                </Badge>
              </div>
              {submission.decision_note ? (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <p className="mb-1 font-medium text-xs">{t("note")}</p>
                  <p className="whitespace-pre-line">
                    {submission.decision_note}
                  </p>
                </div>
              ) : null}
              {canWithdraw(submission.status) ? (
                <Button
                  className="justify-self-start"
                  disabled={withdraw.isPending}
                  onClick={() => withdraw.mutate(submission.id)}
                  size="sm"
                  variant="ghost"
                >
                  {withdraw.isPending && withdraw.variables === submission.id
                    ? t("withdrawing")
                    : t("withdraw")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {withdraw.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("withdrawFailed")}
        </p>
      ) : null}
    </section>
  );
};

/** The member's submissions (Club → Yours): send work, follow decisions, withdraw. */
export const YourSubmissions = () => {
  const t = useTranslations("app.submissions");

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <p className="text-muted-foreground">{t("description")}</p>
      <SubmitForm />
      <MySubmissions />
    </div>
  );
};
