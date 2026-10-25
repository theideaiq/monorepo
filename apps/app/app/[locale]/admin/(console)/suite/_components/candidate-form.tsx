"use client";

import { createClient } from "@repo/auth/client";
import { Label } from "@repo/design-system/components/ui/label";
import { uploadCandidateCv } from "@repo/storage";
import { useTranslations } from "next-intl";
import { type ChangeEvent, useId, useMemo, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { TextareaField, TextField } from "@/components/admin/fields";
import { proposeCandidate } from "../actions";

/**
 * Support proposes a candidate for a job: name, headline, summary and a
 * PDF CV, uploaded straight to the private `candidates` bucket under the
 * company's folder (support may write there; the company reads it).
 */
export const CandidateForm = ({
  jobId,
  organizationId,
}: {
  readonly jobId: string;
  readonly organizationId: string;
}) => {
  const t = useTranslations("admin.suite.hiring");
  const id = useId();
  const supabase = useMemo(() => createClient(), []);
  const [cvPath, setCvPath] = useState("");
  const [state, setState] = useState<"error" | "idle" | "uploading">("idle");

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setState("uploading");
    try {
      const stored = await uploadCandidateCv(supabase, organizationId, file);
      setCvPath(stored.path);
      setState("idle");
    } catch {
      setCvPath("");
      setState("error");
    }
  };

  return (
    <ActionForm action={proposeCandidate} className="grid gap-3">
      <input name="jobId" type="hidden" value={jobId} />
      <input name="cvPath" type="hidden" value={cvPath} />
      <TextField
        label={t("fullName")}
        maxLength={120}
        name="fullName"
        required
      />
      <TextField label={t("headline")} maxLength={200} name="headline" />
      <TextareaField
        label={t("summary")}
        maxLength={4000}
        name="summary"
        rows={4}
      />
      <div className="grid gap-2">
        <Label htmlFor={`${id}-cv`}>{t("cv")}</Label>
        <input
          accept="application/pdf"
          className="text-sm"
          id={`${id}-cv`}
          onChange={upload}
          type="file"
        />
        <p className="text-muted-foreground text-xs" role="status">
          {state === "uploading" ? t("uploading") : null}
          {state === "error" ? t("uploadError") : null}
          {state === "idle" && cvPath ? t("uploaded") : null}
        </p>
      </div>
      <SubmitButton className="w-fit" disabled={state === "uploading"}>
        {t("propose")}
      </SubmitButton>
    </ActionForm>
  );
};
