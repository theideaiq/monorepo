"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { FieldGrid, SelectField, TextField } from "@/components/admin/fields";
import type { PublishMode } from "@/lib/admin/publishing";

/** Draft, publish now, or schedule for a date (Baghdad time). */
export const PublishField = ({
  defaultMode,
  defaultPublishAt,
}: {
  readonly defaultMode: PublishMode;
  /** `datetime-local` value in Baghdad time. */
  readonly defaultPublishAt: string;
}) => {
  const t = useTranslations("admin.editorial.publish");
  const [mode, setMode] = useState<PublishMode>(defaultMode);

  return (
    <FieldGrid>
      <SelectField
        label={t("label")}
        name="mode"
        onChange={(event) => setMode(event.target.value as PublishMode)}
        options={[
          { label: t("draft"), value: "draft" },
          { label: t("now"), value: "now" },
          { label: t("schedule"), value: "schedule" },
        ]}
        value={mode}
      />
      {mode === "schedule" ? (
        <TextField
          defaultValue={defaultPublishAt}
          hint={t("scheduleHint")}
          label={t("at")}
          name="publishAt"
          required
          type="datetime-local"
        />
      ) : null}
    </FieldGrid>
  );
};
