"use client";

import { useLocale, useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { TextField } from "@/components/admin/fields";
import { Panel } from "@/components/admin/page";
import { saveCommissionRates } from "../actions";

export interface CommissionRow {
  categoryId: string;
  nameAr: string;
  nameEn: string;
  /** Fractions, 0.12 = 12%. */
  pro: number;
  standard: number;
}

const toPercent = (value: number) => String(Math.round(value * 10_000) / 100);

/**
 * The commission per top-level category, standard (Free) and Pro, in
 * percent. `/partners` and Partners show these; each order keeps its rate.
 */
export const CommissionForm = ({
  disabled,
  rows,
}: {
  readonly disabled: boolean;
  readonly rows: readonly CommissionRow[];
}) => {
  const t = useTranslations("admin.finance.commission");
  const tCommon = useTranslations("admin.common");
  const locale = useLocale();

  return (
    <ActionForm action={saveCommissionRates}>
      <fieldset className="grid gap-4" disabled={disabled}>
        <Panel>
          <div className="grid gap-1">
            <h2 className="font-semibold">{t("title")}</h2>
            <p className="text-muted-foreground text-sm">{t("description")}</p>
          </div>
          <div className="grid gap-3">
            {rows.map((row) => (
              <div
                className="grid items-end gap-3 sm:grid-cols-[1fr_8rem_8rem]"
                key={row.categoryId}
              >
                <span className="font-medium text-sm">
                  {locale === "en" ? row.nameEn : row.nameAr}
                </span>
                <TextField
                  defaultValue={toPercent(row.standard)}
                  dir="ltr"
                  inputMode="decimal"
                  label={t("standard")}
                  name={`standard.${row.categoryId}`}
                  required
                />
                <TextField
                  defaultValue={toPercent(row.pro)}
                  dir="ltr"
                  inputMode="decimal"
                  label={t("pro")}
                  name={`pro.${row.categoryId}`}
                  required
                />
              </div>
            ))}
          </div>
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
