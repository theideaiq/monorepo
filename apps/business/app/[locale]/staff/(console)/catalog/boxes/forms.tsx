"use client";

import { useTranslations } from "next-intl";
import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { FieldGrid, SelectField, TextField } from "@/components/admin/fields";
import {
  addBox,
  addBoxProduct,
  addBoxSlot,
  addBoxTheme,
  removeBoxPart,
  saveBox,
  setBoxStatus,
  setBoxThemeActive,
} from "../actions";

const SEASONS = ["", "eid", "ramadan", "university"] as const;

/** Makes an existing sale product (by its slug) a box. */
export const AddBoxForm = () => {
  const t = useTranslations("admin.catalog.boxes");
  return (
    <ActionForm action={addBox} className="rounded-md border p-3">
      <FieldGrid columns={3}>
        <TextField dir="ltr" label={t("productSlug")} name="slug" required />
        <TextField
          defaultValue="0"
          dir="ltr"
          inputMode="numeric"
          label={t("minValue")}
          name="minValue"
        />
        <div className="flex items-end">
          <SubmitButton size="sm">{t("add")}</SubmitButton>
        </div>
      </FieldGrid>
    </ActionForm>
  );
};

/** What the picked copies are worth at least, and the season. */
export const BoxSettingsForm = ({
  box,
}: {
  readonly box: { minValue: number; productId: string; season: string | null };
}) => {
  const t = useTranslations("admin.catalog.boxes");
  const tCommon = useTranslations("admin.common");
  return (
    <ActionForm action={saveBox}>
      <input name="id" type="hidden" value={box.productId} />
      <FieldGrid columns={3}>
        <TextField
          defaultValue={box.minValue}
          dir="ltr"
          hint={t("minValueHint")}
          inputMode="numeric"
          label={t("minValue")}
          name="minValue"
        />
        <SelectField
          defaultValue={box.season ?? ""}
          label={t("season")}
          name="season"
          options={SEASONS.map((season) => ({
            label: t(`seasons.${season || "none"}`),
            value: season,
          }))}
        />
        <div className="flex items-end">
          <SubmitButton size="sm">{tCommon("save")}</SubmitButton>
        </div>
      </FieldGrid>
    </ActionForm>
  );
};

/** Adds a fixed product, or a slot filled from a category, to a box. */
export const AddPartForms = ({
  box,
  categories,
}: {
  readonly box: string;
  readonly categories: { label: string; value: string }[];
}) => {
  const t = useTranslations("admin.catalog.boxes");
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <ActionForm action={addBoxProduct} className="rounded-md border p-3">
        <input name="box" type="hidden" value={box} />
        <FieldGrid columns={3}>
          <TextField dir="ltr" label={t("productSlug")} name="slug" required />
          <TextField
            defaultValue="1"
            dir="ltr"
            inputMode="numeric"
            label={t("quantity")}
            name="quantity"
          />
          <div className="flex items-end">
            <SubmitButton size="sm">{t("addProduct")}</SubmitButton>
          </div>
        </FieldGrid>
      </ActionForm>
      <ActionForm action={addBoxSlot} className="rounded-md border p-3">
        <input name="box" type="hidden" value={box} />
        <FieldGrid columns={4}>
          <SelectField
            label={t("category")}
            name="category"
            options={categories}
          />
          <TextField dir="ltr" label={t("format")} name="format" />
          <TextField
            defaultValue="1"
            dir="ltr"
            inputMode="numeric"
            label={t("quantity")}
            name="quantity"
          />
          <div className="flex items-end">
            <SubmitButton size="sm">{t("addSlot")}</SubmitButton>
          </div>
        </FieldGrid>
      </ActionForm>
    </div>
  );
};

export const RemovePartButton = ({ id }: { readonly id: string }) => {
  const t = useTranslations("admin.catalog.boxes");
  return (
    <ActionButton action={removeBoxPart} fields={{ id }} variant="ghost">
      {t("remove")}
    </ActionButton>
  );
};

/** Adds a theme customers pick from. */
export const AddThemeForm = ({ box }: { readonly box: string }) => {
  const t = useTranslations("admin.catalog.boxes");
  return (
    <ActionForm action={addBoxTheme} className="rounded-md border p-3">
      <input name="box" type="hidden" value={box} />
      <FieldGrid columns={3}>
        <TextField label={t("themeAr")} name="nameAr" required />
        <TextField label={t("themeEn")} name="nameEn" required />
        <div className="flex items-end">
          <SubmitButton size="sm">{t("addTheme")}</SubmitButton>
        </div>
      </FieldGrid>
    </ActionForm>
  );
};

export const ThemeToggle = ({
  active,
  id,
}: {
  readonly active: boolean;
  readonly id: string;
}) => {
  const t = useTranslations("admin.catalog.boxes");
  return (
    <ActionButton
      action={setBoxThemeActive}
      fields={{ active: String(!active), id }}
      variant="ghost"
    >
      {active ? t("stopOffering") : t("offerAgain")}
    </ActionButton>
  );
};

/** Puts a box on sale or takes it off. */
export const BoxStatusButton = ({
  id,
  live,
}: {
  readonly id: string;
  readonly live: boolean;
}) => {
  const t = useTranslations("admin.catalog.boxes");
  return (
    <ActionButton
      action={setBoxStatus}
      fields={{ id, status: live ? "draft" : "active" }}
      variant={live ? "outline" : "default"}
    >
      {live ? t("takeOff") : t("putOnSale")}
    </ActionButton>
  );
};
