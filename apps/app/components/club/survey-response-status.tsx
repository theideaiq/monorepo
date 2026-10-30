"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { SectionSpinner } from "@/components/states";
import {
  useAppealResponse,
  useMyResponse,
  useWithdrawResponse,
} from "@/lib/survey-queries";
import type { ExcludedReason } from "@/lib/surveys";

type Response = NonNullable<ReturnType<typeof useMyResponse>["data"]>;

/** A response that didn't count: why, and one appeal. */
const NotCounted = ({
  response,
  surveyId,
}: {
  readonly response: Response;
  readonly surveyId: string;
}) => {
  const t = useTranslations("web.club.surveys.answer");
  const id = useId();
  const appeal = useAppealResponse();
  const [note, setNote] = useState("");
  const reason = (response.excluded_reason ?? "attention") as ExcludedReason;

  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    appeal.mutate({ note, target: surveyId });
  };

  let appealPart = (
    <form className="grid gap-2" onSubmit={send}>
      <Label htmlFor={id}>{t("appeal.label")}</Label>
      <Textarea
        id={id}
        maxLength={1000}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        value={note}
      />
      <Button
        className="justify-self-start"
        disabled={appeal.isPending}
        size="sm"
        type="submit"
        variant="outline"
      >
        {t("appeal.send")}
      </Button>
      {appeal.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("appeal.failed")}
        </p>
      ) : null}
    </form>
  );
  if (response.appeal_decided_at) {
    appealPart = <p className="text-sm">{t("appeal.declined")}</p>;
  } else if (response.appealed_at) {
    appealPart = <p className="text-sm">{t("appeal.sent")}</p>;
  }

  return (
    <div className="grid gap-3">
      <p>{t(`excluded.${reason}`)}</p>
      {appealPart}
    </div>
  );
};

/** Deletes the member's submitted answers while the survey is open. */
const DeleteAnswers = ({ surveyId }: { readonly surveyId: string }) => {
  const t = useTranslations("web.club.surveys.answer");
  const withdraw = useWithdrawResponse();
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <Button
        className="justify-self-start"
        onClick={() => setAsking(true)}
        size="sm"
        variant="ghost"
      >
        {t("delete.open")}
      </Button>
    );
  }
  return (
    <div className="grid gap-2 rounded-lg border p-3">
      <p className="text-sm">{t("delete.explain")}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={withdraw.isPending}
          onClick={() => withdraw.mutate(surveyId)}
          size="sm"
          variant="destructive"
        >
          {t("delete.confirm")}
        </Button>
        <Button onClick={() => setAsking(false)} size="sm" variant="ghost">
          {t("delete.keep")}
        </Button>
      </div>
      {withdraw.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("delete.failed")}
        </p>
      ) : null}
    </div>
  );
};

/**
 * After answering: whether the response counted and what it earned, why
 * not (with one appeal), and deleting the answers while the survey is open.
 */
export const SurveyResponseStatus = ({
  open,
  surveyId,
}: {
  /** The survey still takes answers (so they can be deleted). */
  readonly open: boolean;
  readonly surveyId: string;
}) => {
  const t = useTranslations("web.club.surveys.answer");
  const locale = useLocale() as Locale;
  const response = useMyResponse(surveyId);
  if (response.isPending) {
    return <SectionSpinner />;
  }
  const { data } = response;
  if (!data?.submitted_at) {
    return null;
  }
  if (data.withdrawn_at) {
    return <p>{t("withdrawn")}</p>;
  }

  let status = <NotCounted response={data} surveyId={surveyId} />;
  if (data.counted) {
    status = (
      <p>
        {data.reward_paid > 0
          ? t("thanksReward", {
              bulbs: formatNumber(data.reward_paid, locale),
            })
          : t("thanksCredit")}
      </p>
    );
  }
  return (
    <div className="grid gap-4">
      {status}
      {open ? <DeleteAnswers surveyId={surveyId} /> : null}
    </div>
  );
};
