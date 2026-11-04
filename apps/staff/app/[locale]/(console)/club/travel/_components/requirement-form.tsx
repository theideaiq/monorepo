"use client";

import type { Tables } from "@repo/database";
import { useTranslations } from "next-intl";
import {
  ActionForm,
  FormError,
  SubmitButton,
} from "@/components/admin/action-form";
import {
  CheckboxField,
  FieldGrid,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import {
  travelAnchors,
  travelConfidences,
  travelKinds,
} from "@/lib/admin/travel";
import { saveTravelRequirement } from "../actions";

/** Where a new line goes: a route's own, or a program's extra. */
export type RequirementParent =
  | { opportunityId: string; routeId?: never }
  | { opportunityId?: never; routeId: string };

/**
 * One line of a Travel Kit (a document, task or open question) with its
 * source, how sure it is and the day it was checked. Used for routes and
 * for programs' extras.
 */
export const RequirementForm = ({
  parent,
  requirement,
}: {
  readonly parent: RequirementParent;
  readonly requirement?: Tables<"travel_requirements">;
}) => {
  const t = useTranslations("admin.editorial.travel");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm
      action={saveTravelRequirement}
      className="grid gap-4"
      resetOnSuccess={!requirement}
    >
      {requirement ? (
        <input name="id" type="hidden" value={requirement.id} />
      ) : null}
      {!requirement && parent.routeId ? (
        <input name="routeId" type="hidden" value={parent.routeId} />
      ) : null}
      {!requirement && parent.opportunityId ? (
        <input
          name="opportunityId"
          type="hidden"
          value={parent.opportunityId}
        />
      ) : null}
      <FieldGrid columns={3}>
        <SelectField
          defaultValue={requirement?.kind ?? "document"}
          label={t("kind")}
          name="kind"
          options={travelKinds.map((kind) => ({
            label: t(`kinds.${kind}`),
            value: kind,
          }))}
        />
        <TextField
          defaultValue={requirement?.doc_key ?? ""}
          dir="ltr"
          hint={t("docKeyHint")}
          label={t("docKey")}
          maxLength={40}
          name="docKey"
        />
        <TextField
          defaultValue={requirement?.position ?? 0}
          dir="ltr"
          hint={tCommon("positionHint")}
          inputMode="numeric"
          label={tCommon("position")}
          name="position"
        />
      </FieldGrid>
      <FieldGrid>
        <TextField
          defaultValue={requirement?.title_ar}
          dir="rtl"
          label={t("titleAr")}
          maxLength={200}
          name="titleAr"
          required
        />
        <TextField
          defaultValue={requirement?.title_en}
          dir="ltr"
          label={t("titleEn")}
          maxLength={200}
          name="titleEn"
          required
        />
        <TextareaField
          defaultValue={requirement?.detail_ar ?? ""}
          dir="rtl"
          label={t("detailAr")}
          maxLength={2000}
          name="detailAr"
          rows={3}
        />
        <TextareaField
          defaultValue={requirement?.detail_en ?? ""}
          dir="ltr"
          label={t("detailEn")}
          maxLength={2000}
          name="detailEn"
          rows={3}
        />
      </FieldGrid>
      <FieldGrid columns={3}>
        <TextField
          defaultValue={requirement?.copies ?? ""}
          dir="ltr"
          hint={t("copiesHint")}
          inputMode="numeric"
          label={t("copies")}
          name="copies"
        />
        <SelectField
          defaultValue={requirement?.anchor ?? ""}
          label={t("anchor")}
          name="anchor"
          options={[
            { label: t("anchorNone"), value: "" },
            ...travelAnchors.map((anchor) => ({
              label: t(`anchors.${anchor}`),
              value: anchor,
            })),
          ]}
        />
        <TextField
          defaultValue={requirement?.lead_days ?? ""}
          dir="ltr"
          hint={t("leadDaysHint")}
          inputMode="numeric"
          label={t("leadDays")}
          name="leadDays"
        />
      </FieldGrid>
      <FieldGrid columns={3}>
        <SelectField
          defaultValue={requirement?.confidence ?? "unconfirmed"}
          hint={t("confidenceHint")}
          label={t("confidence")}
          name="confidence"
          options={travelConfidences.map((confidence) => ({
            label: t(`confidences.${confidence}`),
            value: confidence,
          }))}
        />
        <TextField
          defaultValue={requirement?.source_url}
          dir="ltr"
          hint={t("sourceUrlHint")}
          label={t("sourceUrl")}
          maxLength={1000}
          name="sourceUrl"
          required
          type="url"
        />
        <TextField
          defaultValue={requirement?.checked_on}
          label={t("checkedOn")}
          name="checkedOn"
          required
          type="date"
        />
      </FieldGrid>
      <CheckboxField
        defaultChecked={requirement?.minors_only ?? false}
        hint={t("minorsOnlyHint")}
        label={t("minorsOnly")}
        name="minorsOnly"
      />
      <FormError />
      <SubmitButton className="justify-self-start" size="sm">
        {requirement ? tCommon("save") : t("addRequirement")}
      </SubmitButton>
    </ActionForm>
  );
};
