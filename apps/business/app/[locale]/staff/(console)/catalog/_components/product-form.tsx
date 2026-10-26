"use client";

import type { Tables } from "@repo/database";
import { Constants } from "@repo/database";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  CheckboxField,
  FieldGrid,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { FileUpload } from "@/components/admin/file-upload";
import { KeyValueEditor } from "@/components/admin/key-value-editor";
import { Panel } from "@/components/admin/page";
import { withCurrentTier } from "@/lib/admin/catalog";
import { saveProduct } from "../actions";

const { Enums } = Constants.public;

interface ProductFormProps {
  readonly categories: { id: string; label: string }[];
  readonly disabled?: boolean;
  readonly product?: Tables<"products">;
  readonly supabaseUrl: string;
  /** The IDEA Plus tiers, with the plan names at each (see `tierOptions`). */
  readonly tiers: { names: string; tier: number }[];
  /**
   * The product has several variants: its price and stock are theirs (set
   * on each variant), shown here read-only.
   */
  readonly variantPriced?: boolean;
}

/**
 * Price, compare-at price, stock, condition and the other-formats group.
 * With several variants, price and stock are theirs: shown read-only.
 */
const PricingPanel = ({
  product,
  variantPriced,
}: {
  readonly product?: Tables<"products">;
  readonly variantPriced: boolean;
}) => {
  const t = useTranslations("admin.catalog");
  const tStore = useTranslations("store");
  return (
    <Panel
      description={variantPriced ? t("variants.variantPriced") : undefined}
      title={t("products.pricing")}
    >
      <FieldGrid columns={4}>
        <TextField
          defaultValue={product?.price ?? ""}
          dir="ltr"
          hint={t("fields.priceHint")}
          inputMode="numeric"
          label={t("fields.price")}
          name="price"
          readOnly={variantPriced}
          required
        />
        <TextField
          defaultValue={product?.compare_at_price ?? ""}
          dir="ltr"
          hint={t("fields.compareAtHint")}
          inputMode="numeric"
          label={t("fields.compareAt")}
          name="compareAtPrice"
          readOnly={variantPriced}
        />
        <TextField
          defaultValue={product?.stock_count ?? 0}
          dir="ltr"
          hint={t("fields.stockHint")}
          inputMode="numeric"
          label={t("fields.stock")}
          name="stock"
          readOnly={variantPriced}
          required
        />
        <SelectField
          defaultValue={product?.condition ?? "new"}
          label={t("fields.condition")}
          name="condition"
          options={Enums.product_condition.map((value) => ({
            label: tStore(`condition.${value}`),
            value,
          }))}
        />
      </FieldGrid>
    </Panel>
  );
};

export const ProductForm = ({
  categories,
  disabled = false,
  product,
  supabaseUrl,
  tiers,
  variantPriced = false,
}: ProductFormProps) => {
  const t = useTranslations("admin.catalog");
  const tStore = useTranslations("store");
  const tCommon = useTranslations("admin.common");
  const [kind, setKind] = useState<string>(product?.kind ?? "sale");
  const currentTier = product?.rental_tier ?? null;
  const tierChoices = withCurrentTier(
    tiers,
    currentTier,
    t("fields.unknownTier")
  );

  return (
    <ActionForm action={saveProduct}>
      {product ? <input name="id" type="hidden" value={product.id} /> : null}
      <fieldset className="grid gap-6" disabled={disabled}>
        <Panel title={t("products.basics")}>
          <FieldGrid>
            <TextField
              defaultValue={product?.name_ar}
              dir="rtl"
              label={t("fields.nameAr")}
              maxLength={200}
              name="nameAr"
              required
            />
            <TextField
              defaultValue={product?.name_en}
              dir="ltr"
              label={t("fields.nameEn")}
              maxLength={200}
              name="nameEn"
              required
            />
            <TextField
              defaultValue={product?.slug}
              dir="ltr"
              hint={t("fields.slugHint")}
              label={t("fields.slug")}
              maxLength={120}
              name="slug"
              required
            />
            <SelectField
              defaultValue={product?.category_id ?? ""}
              label={t("fields.category")}
              name="categoryId"
              options={[
                { label: tCommon("none"), value: "" },
                ...categories.map((category) => ({
                  label: category.label,
                  value: category.id,
                })),
              ]}
            />
            <SelectField
              hint={t("fields.kindHint")}
              label={t("fields.kind")}
              name="kind"
              onChange={(event) => setKind(event.target.value)}
              options={Enums.product_kind.map((value) => ({
                label: tStore(`kind.${value}`),
                value,
              }))}
              value={kind}
            />
            <SelectField
              defaultValue={product?.status ?? "draft"}
              hint={t("fields.statusHint")}
              label={t("fields.status")}
              name="status"
              options={Enums.product_status.map((value) => ({
                label: t(`productStatus.${value}`),
                value,
              }))}
            />
            <SelectField
              defaultValue={String(product?.age_rating ?? "")}
              hint={t("fields.ageRatingHint")}
              label={t("fields.ageRating")}
              name="ageRating"
              options={[
                { label: tCommon("none"), value: "" },
                ...["3", "7", "12", "16", "18"].map((value) => ({
                  label: `PEGI ${value}`,
                  value,
                })),
              ]}
            />
            <TextField
              defaultValue={product?.bulb_multiplier ?? ""}
              dir="ltr"
              hint={t("fields.bulbMultiplierHint")}
              inputMode="decimal"
              label={t("fields.bulbMultiplier")}
              name="bulbMultiplier"
            />
            <TextField
              defaultValue={product?.seller ?? "The IDEA"}
              hint={t("fields.sellerHint")}
              label={t("fields.seller")}
              maxLength={120}
              name="seller"
              required
            />
            {kind === "rental" || product?.rentable ? (
              <SelectField
                defaultValue={String(currentTier ?? "")}
                hint={t("fields.rentalTierHint")}
                label={t("fields.rentalTier")}
                name="rentalTier"
                options={[
                  { label: t("fields.anyPlan"), value: "" },
                  ...tierChoices.map((item) => ({
                    label: t("fields.tierOption", {
                      names: item.names,
                      tier: String(item.tier),
                    }),
                    value: String(item.tier),
                  })),
                ]}
              />
            ) : null}
          </FieldGrid>
          <CheckboxField
            defaultChecked={product?.featured ?? false}
            hint={t("fields.featuredHint")}
            label={t("fields.featured")}
            name="featured"
          />
          <CheckboxField
            defaultChecked={product?.verified ?? true}
            hint={t("fields.verifiedHint")}
            label={t("fields.verified")}
            name="verified"
          />
        </Panel>

        <PricingPanel product={product} variantPriced={variantPriced} />

        <Panel title={t("products.content")}>
          <FieldGrid>
            <TextareaField
              defaultValue={product?.description_ar ?? ""}
              dir="rtl"
              label={t("fields.descriptionAr")}
              maxLength={10_000}
              name="descriptionAr"
              rows={6}
            />
            <TextareaField
              defaultValue={product?.description_en ?? ""}
              dir="ltr"
              label={t("fields.descriptionEn")}
              maxLength={10_000}
              name="descriptionEn"
              rows={6}
            />
          </FieldGrid>
          <FileUpload
            accept="image"
            bucket="catalog"
            defaultPaths={product?.images ?? []}
            folder="products"
            label={t("fields.images")}
            max={12}
            name="images"
            supabaseUrl={supabaseUrl}
          />
          <KeyValueEditor
            defaultValue={
              (product?.details as Record<string, unknown> | undefined) ?? null
            }
            label={t("fields.details")}
            prefix="detail"
          />
        </Panel>

        {disabled ? null : (
          <div className="flex justify-end">
            <SubmitButton>{tCommon("save")}</SubmitButton>
          </div>
        )}
      </fieldset>
    </ActionForm>
  );
};
