"use client";

import type { Tables } from "@repo/database";
import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  CheckboxField,
  FieldGrid,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { FileUpload } from "@/components/admin/file-upload";
import { Panel } from "@/components/admin/page";
import { saveEvent } from "../actions";

interface EventFormProps {
  readonly endsAt: string;
  readonly event?: Tables<"events">;
  /** When RSVPs open to everyone, as a Baghdad `datetime-local` value. */
  readonly rsvpOpensAt: string;
  readonly startsAt: string;
  readonly supabaseUrl: string;
}

/** An event with RSVPs; times are Baghdad time. */
export const EventForm = ({
  endsAt,
  event,
  rsvpOpensAt,
  startsAt,
  supabaseUrl,
}: EventFormProps) => {
  const t = useTranslations("admin.editorial.events");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm action={saveEvent}>
      {event ? <input name="id" type="hidden" value={event.id} /> : null}
      <Panel>
        <FieldGrid>
          <TextField
            defaultValue={event?.title_ar}
            dir="rtl"
            label={t("titleAr")}
            maxLength={200}
            name="titleAr"
            required
          />
          <TextField
            defaultValue={event?.title_en}
            dir="ltr"
            label={t("titleEn")}
            maxLength={200}
            name="titleEn"
            required
          />
          <TextField
            defaultValue={event?.slug}
            dir="ltr"
            label={t("slug")}
            maxLength={120}
            name="slug"
            required
          />
          <TextField
            defaultValue={event?.location}
            label={t("location")}
            maxLength={300}
            name="location"
            required
          />
          <TextField
            defaultValue={startsAt}
            hint={t("timeHint")}
            label={t("startsAt")}
            name="startsAt"
            required
            type="datetime-local"
          />
          <TextField
            defaultValue={endsAt}
            label={t("endsAt")}
            name="endsAt"
            type="datetime-local"
          />
          <TextField
            defaultValue={event?.capacity ?? ""}
            dir="ltr"
            hint={t("capacityHint")}
            inputMode="numeric"
            label={t("capacity")}
            name="capacity"
          />
          <TextField
            defaultValue={event?.blaze_seats || ""}
            dir="ltr"
            hint={t("blazeSeatsHint")}
            inputMode="numeric"
            label={t("blazeSeats")}
            name="blazeSeats"
          />
          <TextField
            defaultValue={rsvpOpensAt}
            hint={t("rsvpOpensHint")}
            label={t("rsvpOpens")}
            name="rsvpOpensAt"
            type="datetime-local"
          />
        </FieldGrid>
        <FieldGrid>
          <TextareaField
            defaultValue={event?.description_ar ?? ""}
            dir="rtl"
            label={t("descriptionAr")}
            maxLength={10_000}
            name="descriptionAr"
            rows={6}
          />
          <TextareaField
            defaultValue={event?.description_en ?? ""}
            dir="ltr"
            label={t("descriptionEn")}
            maxLength={10_000}
            name="descriptionEn"
            rows={6}
          />
        </FieldGrid>
        <FileUpload
          accept="image"
          bucket="editorial"
          defaultPaths={event?.cover_image ? [event.cover_image] : []}
          folder="events"
          label={t("cover")}
          name="coverImage"
          supabaseUrl={supabaseUrl}
        />
        <CheckboxField
          defaultChecked={event?.published ?? false}
          hint={t("publishedHint")}
          label={t("published")}
          name="published"
        />
      </Panel>
      <div className="flex justify-end">
        <SubmitButton>{tCommon("save")}</SubmitButton>
      </div>
    </ActionForm>
  );
};
