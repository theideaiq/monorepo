"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  FieldGrid,
  SelectField,
  TextareaField,
} from "@/components/admin/fields";
import { assignSubmission, decideSubmission, saveReview } from "../actions";

export const AssignForm = ({
  assignee,
  editors,
  id,
}: {
  readonly assignee: string | null;
  readonly editors: { id: string; name: string }[];
  readonly id: string;
}) => {
  const t = useTranslations("admin.editorial.review");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm
      action={assignSubmission}
      className="flex flex-wrap items-end gap-2"
    >
      <input name="id" type="hidden" value={id} />
      <SelectField
        defaultValue={assignee ?? ""}
        label={t("assignee")}
        name="assignee"
        options={[
          { label: t("unassigned"), value: "" },
          ...editors.map((editor) => ({
            label: editor.name,
            value: editor.id,
          })),
        ]}
        wrapperClassName="min-w-48 flex-1"
      />
      <SubmitButton variant="secondary">{tCommon("save")}</SubmitButton>
    </ActionForm>
  );
};

interface Review {
  archive_worthy: boolean | null;
  formatting: string | null;
  notes: string | null;
  originality: number | null;
  technical: number | null;
  thematic: number | null;
}

const SCORES = ["", "0", "10", "20"];

const yesNo = (value: boolean | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }
  return value ? "yes" : "no";
};

/** The rubric: three criteria scored 0, 10 or 20 (out of 60). */
export const RubricForm = ({
  id,
  review,
}: {
  readonly id: string;
  readonly review: Review | null;
}) => {
  const t = useTranslations("admin.editorial.review");
  const tCommon = useTranslations("admin.common");
  const [scores, setScores] = useState({
    originality: review?.originality?.toString() ?? "",
    technical: review?.technical?.toString() ?? "",
    thematic: review?.thematic?.toString() ?? "",
  });
  const total = Object.values(scores).reduce(
    (sum, value) => sum + (value ? Number(value) : 0),
    0
  );
  const scoreOptions = SCORES.map((value) => ({
    label: value === "" ? t("notScored") : value,
    value,
  }));

  return (
    <ActionForm action={saveReview}>
      <input name="id" type="hidden" value={id} />
      <FieldGrid columns={3}>
        {(["technical", "originality", "thematic"] as const).map(
          (criterion) => (
            <SelectField
              hint={t(`criteria.${criterion}Hint`)}
              key={criterion}
              label={t(`criteria.${criterion}`)}
              name={criterion}
              onChange={(event) =>
                setScores((current) => ({
                  ...current,
                  [criterion]: event.target.value,
                }))
              }
              options={scoreOptions}
              value={scores[criterion]}
            />
          )
        )}
      </FieldGrid>
      <p className="font-medium text-sm">
        {t("total", { score: String(total) })}
      </p>
      <FieldGrid>
        <SelectField
          defaultValue={yesNo(review?.archive_worthy)}
          label={t("archiveWorthy")}
          name="archiveWorthy"
          options={[
            { label: t("notScored"), value: "" },
            { label: tCommon("yes"), value: "yes" },
            { label: tCommon("no"), value: "no" },
          ]}
        />
        <SelectField
          defaultValue={review?.formatting ?? ""}
          hint={t("formattingHint")}
          label={t("formatting")}
          name="formatting"
          options={[
            { label: t("notScored"), value: "" },
            { label: t("formattingOptions.pass"), value: "pass" },
            { label: t("formattingOptions.fail"), value: "fail" },
            {
              label: t("formattingOptions.disqualified"),
              value: "disqualified",
            },
          ]}
        />
      </FieldGrid>
      <TextareaField
        defaultValue={review?.notes ?? ""}
        hint={t("notesHint")}
        label={t("notes")}
        maxLength={10_000}
        name="notes"
        rows={5}
      />
      <SubmitButton className="w-fit" variant="secondary">
        {t("saveRubric")}
      </SubmitButton>
    </ActionForm>
  );
};

const DECISIONS = [
  "pending",
  "under_review",
  "revisions_requested",
  "accepted",
  "rejected",
] as const;

/** The status shown to the author, and the note that goes with it. */
export const DecisionForm = ({
  decisionNote,
  id,
  status,
}: {
  readonly decisionNote: string | null;
  readonly id: string;
  readonly status: string;
}) => {
  const t = useTranslations("admin.editorial.review");
  const tStore = useTranslations("store.submissionStatus");

  return (
    <ActionForm action={decideSubmission}>
      <input name="id" type="hidden" value={id} />
      <SelectField
        defaultValue={status}
        hint={t("decisionHint")}
        label={t("decision")}
        name="status"
        options={DECISIONS.map((value) => ({ label: tStore(value), value }))}
      />
      <TextareaField
        defaultValue={decisionNote ?? ""}
        dir="auto"
        hint={t("decisionNoteHint")}
        label={t("decisionNote")}
        maxLength={5000}
        name="decisionNote"
        rows={5}
      />
      <SubmitButton className="w-fit">{t("saveDecision")}</SubmitButton>
    </ActionForm>
  );
};
