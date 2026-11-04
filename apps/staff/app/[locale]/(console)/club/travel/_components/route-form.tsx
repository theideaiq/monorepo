"use client";

import type { Tables } from "@repo/database";
import { useTranslations } from "next-intl";
import {
  ActionForm,
  FormError,
  SubmitButton,
} from "@/components/admin/action-form";
import {
  FieldGrid,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { Panel } from "@/components/admin/page";
import { routeStatuses } from "@/lib/admin/travel";
import { saveTravelRoute } from "../actions";

/** A Travel Kit route: a country and a visa type, with where to apply. */
export const RouteForm = ({
  route,
}: {
  readonly route?: Tables<"travel_routes">;
}) => {
  const t = useTranslations("admin.editorial.travel");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm action={saveTravelRoute}>
      {route ? <input name="id" type="hidden" value={route.id} /> : null}
      <Panel title={t("route")}>
        <FieldGrid>
          <TextField
            defaultValue={route?.country}
            dir="ltr"
            hint={t("countryHint")}
            label={t("countryCode")}
            maxLength={2}
            name="country"
            required
          />
          <TextField
            defaultValue={route?.slug}
            dir="ltr"
            hint={t("slugHint")}
            label={t("slug")}
            maxLength={80}
            name="slug"
            required
          />
          <TextField
            defaultValue={route?.visa_ar}
            dir="rtl"
            label={t("visaAr")}
            maxLength={200}
            name="visaAr"
            required
          />
          <TextField
            defaultValue={route?.visa_en}
            dir="ltr"
            label={t("visaEn")}
            maxLength={200}
            name="visaEn"
            required
          />
          <TextareaField
            defaultValue={route?.apply_at_ar ?? ""}
            dir="rtl"
            label={t("applyAtAr")}
            maxLength={1000}
            name="applyAtAr"
            rows={3}
          />
          <TextareaField
            defaultValue={route?.apply_at_en ?? ""}
            dir="ltr"
            label={t("applyAtEn")}
            maxLength={1000}
            name="applyAtEn"
            rows={3}
          />
          <TextareaField
            defaultValue={route?.ask_ar ?? ""}
            dir="rtl"
            label={t("askAr")}
            maxLength={500}
            name="askAr"
            rows={2}
          />
          <TextareaField
            defaultValue={route?.ask_en ?? ""}
            dir="ltr"
            label={t("askEn")}
            maxLength={500}
            name="askEn"
            rows={2}
          />
          <TextareaField
            defaultValue={route?.note_ar ?? ""}
            dir="rtl"
            hint={t("noteHint")}
            label={t("noteAr")}
            maxLength={2000}
            name="noteAr"
            rows={3}
          />
          <TextareaField
            defaultValue={route?.note_en ?? ""}
            dir="ltr"
            label={t("noteEn")}
            maxLength={2000}
            name="noteEn"
            rows={3}
          />
          <TextField
            defaultValue={route?.checked_on ?? ""}
            hint={t("checkedOnHint")}
            label={t("checkedOn")}
            name="checkedOn"
            type="date"
          />
          <SelectField
            defaultValue={route?.status ?? "draft"}
            hint={t("statusHint")}
            label={t("status")}
            name="status"
            options={routeStatuses.map((status) => ({
              label: t(`statuses.${status}`),
              value: status,
            }))}
          />
        </FieldGrid>
        <FormError />
      </Panel>
      <div className="flex justify-end">
        <SubmitButton>{tCommon("save")}</SubmitButton>
      </div>
    </ActionForm>
  );
};
