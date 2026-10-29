"use client";

import { HOUSE_SELLER_ID } from "@repo/commerce";
import { Constants, type Tables } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import type { Locale } from "@repo/internationalization";
import { useLocale, useTranslations } from "next-intl";
import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { FieldGrid, SelectField, TextField } from "@/components/admin/fields";
import { Panel } from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import type { SupplierOption } from "@/lib/admin/suppliers";
import { addCopies, deleteCopy, saveCopy } from "../actions";

const { Enums } = Constants.public;

type Copy = Tables<"stock_items">;

/** A product's variant as the copies panel names it. */
export interface CopyVariant {
  id: string;
  label: string;
}

interface CopyFieldsProps {
  readonly copy?: Copy;
  readonly defaultCondition: Copy["condition"];
  readonly defaultPurpose: Copy["purpose"];
  /** The IDEA first, then the shops that supply it. */
  readonly suppliers: readonly SupplierOption[];
  /** The product's variants (at least one). */
  readonly variants: readonly CopyVariant[];
}

/**
 * Variant, condition, purpose, owner, place, prices, serial and note of a
 * copy. The owner is chosen only between The IDEA and its suppliers; a
 * shop's own copies (its listings) keep their shop.
 */
const CopyFields = ({
  copy,
  defaultCondition,
  defaultPurpose,
  suppliers,
  variants,
}: CopyFieldsProps) => {
  const t = useTranslations("admin.catalog");
  const tStore = useTranslations("store");
  const owner = copy?.seller_id ?? HOUSE_SELLER_ID;
  const chooseOwner =
    suppliers.length > 1 && suppliers.some((row) => row.id === owner);
  return (
    <FieldGrid columns={4}>
      {variants.length > 1 ? (
        <SelectField
          defaultValue={copy?.variant_id ?? variants[0]?.id}
          label={t("copies.variant")}
          name="variantId"
          options={variants.map((variant) => ({
            label: variant.label,
            value: variant.id,
          }))}
        />
      ) : (
        <input
          name="variantId"
          type="hidden"
          value={copy?.variant_id ?? variants[0]?.id ?? ""}
        />
      )}
      <SelectField
        defaultValue={copy?.condition ?? defaultCondition}
        label={t("fields.condition")}
        name="condition"
        options={Enums.product_condition.map((value) => ({
          label: tStore(`condition.${value}`),
          value,
        }))}
      />
      <SelectField
        defaultValue={copy?.purpose ?? defaultPurpose}
        label={t("copies.purpose")}
        name="purpose"
        options={Enums.stock_purpose.map((value) => ({
          label: t(`copies.purposes.${value}`),
          value,
        }))}
      />
      {chooseOwner ? (
        <SelectField
          defaultValue={owner}
          hint={t("copies.supplierHint")}
          label={t("copies.supplier")}
          name="sellerId"
          options={suppliers.map((row) => ({
            label: row.name,
            value: row.id,
          }))}
        />
      ) : null}
      <TextField
        defaultValue={copy?.location ?? ""}
        label={t("copies.location")}
        maxLength={120}
        name="location"
      />
      <TextField
        defaultValue={copy?.serial ?? ""}
        dir="ltr"
        label={t("copies.serial")}
        maxLength={120}
        name="serial"
      />
      <TextField
        defaultValue={copy?.price ?? ""}
        dir="ltr"
        hint={t("copies.priceHint")}
        inputMode="numeric"
        label={t("copies.price")}
        name="price"
      />
      <TextField
        defaultValue={copy?.cost ?? ""}
        dir="ltr"
        inputMode="numeric"
        label={t("copies.cost")}
        name="cost"
      />
      <TextField
        defaultValue={copy?.note ?? ""}
        label={t("copies.note")}
        maxLength={1000}
        name="note"
        wrapperClassName="sm:col-span-2"
      />
    </FieldGrid>
  );
};

interface CopyRowProps extends Omit<CopyFieldsProps, "copy"> {
  readonly copy: Copy;
  readonly disabled: boolean;
}

const CopyRow = ({ copy, disabled, ...defaults }: CopyRowProps) => {
  const t = useTranslations("admin.catalog");
  const tCommon = useTranslations("admin.common");
  const format = formatters(useLocale() as Locale);
  return (
    <li className="grid gap-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={copy.status === "available" ? "default" : "secondary"}>
          {t(`copies.statuses.${copy.status}`)}
        </Badge>
        <span className="text-muted-foreground">
          {format.date(copy.acquired_at)}
        </span>
      </div>
      <ActionForm action={saveCopy}>
        <input name="id" type="hidden" value={copy.id} />
        <fieldset className="grid gap-3" disabled={disabled}>
          <CopyFields copy={copy} {...defaults} />
          <SelectField
            defaultValue={copy.status}
            label={t("copies.status")}
            name="status"
            options={Enums.stock_status.map((value) => ({
              label: t(`copies.statuses.${value}`),
              value,
            }))}
            wrapperClassName="max-w-xs"
          />
          {disabled ? null : (
            <div className="flex justify-end gap-2">
              <SubmitButton size="sm" variant="secondary">
                {tCommon("save")}
              </SubmitButton>
            </div>
          )}
        </fieldset>
      </ActionForm>
      {disabled ? null : (
        <div className="flex justify-end">
          <ActionButton
            action={deleteCopy}
            confirm={{ title: tCommon("deleteConfirm") }}
            fields={{ id: copy.id }}
            variant="ghost"
          >
            {tCommon("delete")}
          </ActionButton>
        </div>
      )}
    </li>
  );
};

interface CopiesPanelProps {
  readonly copies: Copy[];
  readonly disabled: boolean;
  readonly product: Pick<Tables<"products">, "condition" | "id" | "kind">;
  readonly suppliers: readonly SupplierOption[];
  readonly variants: readonly CopyVariant[];
}

/**
 * The product's physical copies (shared catalogue): add copies, and edit or
 * remove each one. The stock counts follow the available copies.
 */
export const CopiesPanel = ({
  copies,
  disabled,
  product,
  suppliers,
  variants,
}: CopiesPanelProps) => {
  const t = useTranslations("admin.catalog");
  const format = formatters(useLocale() as Locale);
  const defaults = {
    defaultCondition: product.condition,
    defaultPurpose: product.kind === "rental" ? "rental" : "sale",
    suppliers,
    variants,
  } as const;
  const available = copies.filter((copy) => copy.status === "available");

  return (
    <Panel description={t("copies.description")} title={t("copies.title")}>
      <p className="text-muted-foreground text-sm">
        {t("copies.summary", {
          available: format.number(available.length),
          total: format.number(copies.length),
        })}
      </p>
      {copies.length > 0 ? (
        <ul className="grid gap-3">
          {copies.map((copy) => (
            <CopyRow
              copy={copy}
              disabled={disabled}
              key={`${copy.id}-${copy.updated_at}`}
              {...defaults}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">{t("copies.empty")}</p>
      )}
      {disabled ? null : (
        <ActionForm action={addCopies} resetOnSuccess>
          <input name="productId" type="hidden" value={product.id} />
          <div className="grid gap-3 rounded-md border border-dashed p-3">
            <CopyFields {...defaults} />
            <div className="flex items-end justify-end gap-2">
              <TextField
                defaultValue={1}
                dir="ltr"
                inputMode="numeric"
                label={t("copies.count")}
                name="count"
                wrapperClassName="w-28"
              />
              <SubmitButton size="sm">{t("copies.add")}</SubmitButton>
            </div>
          </div>
        </ActionForm>
      )}
    </Panel>
  );
};
