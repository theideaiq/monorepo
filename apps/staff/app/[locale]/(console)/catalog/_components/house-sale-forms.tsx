"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { TextField } from "@/components/admin/fields";
import { setHouseDeal, setHouseSale, setHouseStudentPrice } from "../actions";

/** A new sale on one of The IDEA's listings (Baghdad time). */
export const HouseSaleForm = ({
  condition,
  variantId,
}: {
  readonly condition: string;
  readonly variantId: string;
}) => {
  const t = useTranslations("admin.catalog.sales");
  return (
    <ActionForm
      action={setHouseSale}
      className="flex flex-wrap items-end gap-3"
      resetOnSuccess
    >
      <input name="variantId" type="hidden" value={variantId} />
      <input name="condition" type="hidden" value={condition} />
      <TextField
        dir="ltr"
        inputMode="numeric"
        label={t("salePrice")}
        name="price"
        required
        wrapperClassName="w-36"
      />
      <TextField
        label={t("startsAt")}
        name="startsAt"
        required
        type="datetime-local"
      />
      <TextField
        label={t("endsAt")}
        name="endsAt"
        required
        type="datetime-local"
      />
      <SubmitButton size="sm" variant="outline">
        {t("addSale")}
      </SubmitButton>
    </ActionForm>
  );
};

/** A new quantity deal on one of The IDEA's listings. */
export const HouseDealForm = ({
  condition,
  variantId,
}: {
  readonly condition: string;
  readonly variantId: string;
}) => {
  const t = useTranslations("admin.catalog.sales");
  return (
    <ActionForm
      action={setHouseDeal}
      className="flex flex-wrap items-end gap-3"
      resetOnSuccess
    >
      <input name="variantId" type="hidden" value={variantId} />
      <input name="condition" type="hidden" value={condition} />
      <TextField
        dir="ltr"
        inputMode="numeric"
        label={t("fromQuantity")}
        name="fromQuantity"
        required
        wrapperClassName="w-28"
      />
      <TextField
        dir="ltr"
        inputMode="numeric"
        label={t("rate")}
        name="rate"
        required
        wrapperClassName="w-28"
      />
      <SubmitButton size="sm" variant="outline">
        {t("addDeal")}
      </SubmitButton>
    </ActionForm>
  );
};

/** The student price of one of The IDEA's listings (set or change it). */
export const HouseStudentPriceForm = ({
  condition,
  variantId,
}: {
  readonly condition: string;
  readonly variantId: string;
}) => {
  const t = useTranslations("admin.catalog.sales");
  return (
    <ActionForm
      action={setHouseStudentPrice}
      className="flex flex-wrap items-end gap-3"
      resetOnSuccess
    >
      <input name="variantId" type="hidden" value={variantId} />
      <input name="condition" type="hidden" value={condition} />
      <TextField
        dir="ltr"
        hint={t("studentPriceHint")}
        inputMode="numeric"
        label={t("studentPriceField")}
        name="price"
        required
        wrapperClassName="w-48"
      />
      <SubmitButton size="sm" variant="outline">
        {t("setStudentPrice")}
      </SubmitButton>
    </ActionForm>
  );
};
