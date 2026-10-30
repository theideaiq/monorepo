"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  CheckboxField,
  FieldGrid,
  SelectField,
  TextField,
} from "@/components/admin/fields";
import { addPlusArea, savePlusSettings, updatePlusArea } from "../actions";

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

interface Area {
  active: boolean;
  id: string;
  name_ar: string;
  name_en: string;
  weekday: number | null;
}

/** One area of Baghdad: its names, delivery day and whether it's offered. */
export const AreaForm = ({
  area,
  disabled,
}: {
  /** Null for a new area. */
  readonly area: Area | null;
  readonly disabled: boolean;
}) => {
  const t = useTranslations("admin.rentals.plus");
  const tDays = useTranslations("app.plus.weekdays");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm
      action={area ? updatePlusArea : addPlusArea}
      className="rounded-md border p-3"
    >
      <fieldset disabled={disabled}>
        {area ? <input name="id" type="hidden" value={area.id} /> : null}
        <FieldGrid columns={4}>
          <TextField
            defaultValue={area?.name_en ?? ""}
            label={t("nameEn")}
            name="nameEn"
            required
          />
          <TextField
            defaultValue={area?.name_ar ?? ""}
            dir="rtl"
            label={t("nameAr")}
            name="nameAr"
            required
          />
          <SelectField
            defaultValue={
              area?.weekday === null || !area ? "" : String(area.weekday)
            }
            label={t("day")}
            name="weekday"
            options={[
              { label: t("noDay"), value: "" },
              ...WEEKDAYS.map((day, index) => ({
                label: tDays(day),
                value: String(index),
              })),
            ]}
          />
          <div className="flex items-end justify-between gap-3">
            <CheckboxField
              defaultChecked={area?.active ?? true}
              label={t("offered")}
              name="active"
            />
            {disabled ? null : (
              <SubmitButton size="sm">
                {area ? tCommon("save") : t("addArea")}
              </SubmitButton>
            )}
          </div>
        </FieldGrid>
      </fieldset>
    </ActionForm>
  );
};

/** Places, how long an invite stays open and the extra home swap fee. */
export const PlusSettingsForm = ({
  disabled,
  settings,
}: {
  readonly disabled: boolean;
  readonly settings: {
    extra_swap_fee: number;
    plus_capacity: number;
    plus_invite_hours: number;
  };
}) => {
  const t = useTranslations("admin.rentals.plus");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm action={savePlusSettings}>
      <fieldset className="grid gap-4" disabled={disabled}>
        <FieldGrid columns={3}>
          <TextField
            defaultValue={settings.plus_capacity}
            dir="ltr"
            hint={t("capacityHint")}
            inputMode="numeric"
            label={t("capacity")}
            name="capacity"
          />
          <TextField
            defaultValue={settings.plus_invite_hours}
            dir="ltr"
            inputMode="numeric"
            label={t("inviteHours")}
            name="inviteHours"
          />
          <TextField
            defaultValue={settings.extra_swap_fee}
            dir="ltr"
            inputMode="numeric"
            label={t("swapFee")}
            name="swapFee"
          />
        </FieldGrid>
        {disabled ? null : (
          <div className="flex justify-end">
            <SubmitButton>{tCommon("save")}</SubmitButton>
          </div>
        )}
      </fieldset>
    </ActionForm>
  );
};
