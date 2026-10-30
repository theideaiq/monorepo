"use client";

import { Input } from "@repo/design-system/components/ui/input";
import { useTranslations } from "next-intl";
import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  CheckboxField,
  FieldGrid,
  SelectField,
  TextField,
} from "@/components/admin/fields";
import type { SupplierOption } from "@/lib/admin/suppliers";
import {
  addKitUnit,
  collectKit,
  handOverKit,
  saveKitType,
  setKitUnitStatus,
  waiveKitDeposit,
} from "../actions";

/** Waive the deposit, hand over, or collect (with any damage). */
export const KitBookingActions = ({
  canWaive,
  id,
  paid,
  status,
}: {
  readonly canWaive: boolean;
  readonly id: string;
  readonly paid: boolean;
  readonly status: string;
}) => {
  const t = useTranslations("admin.rentals.kits");

  if (status === "out") {
    return (
      <ActionForm
        action={collectKit}
        className="flex items-center justify-end gap-2"
      >
        <input name="id" type="hidden" value={id} />
        <Input
          aria-label={t("damage")}
          className="w-28"
          defaultValue="0"
          dir="ltr"
          inputMode="numeric"
          name="damage"
        />
        <SubmitButton size="sm">{t("collect")}</SubmitButton>
      </ActionForm>
    );
  }
  if (status !== "booked") {
    return null;
  }
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {canWaive ? (
        <ActionButton
          action={waiveKitDeposit}
          confirm={{
            description: t("waiveDescription"),
            title: t("waiveConfirm"),
          }}
          fields={{ id }}
          variant="ghost"
        >
          {t("waive")}
        </ActionButton>
      ) : null}
      {paid ? (
        <ActionButton action={handOverKit} fields={{ id }} variant="default">
          {t("handOver")}
        </ActionButton>
      ) : null}
    </div>
  );
};

/** A kit's prices, deposit and whether it's offered. */
export const KitTypeForm = ({
  disabled,
  kit,
}: {
  readonly disabled: boolean;
  readonly kit: {
    active: boolean;
    deposit: number;
    extra_day_price: number;
    id: string;
    name: string;
    price: number;
  };
}) => {
  const t = useTranslations("admin.rentals.kits");
  const tCommon = useTranslations("admin.common");
  return (
    <ActionForm action={saveKitType} className="rounded-md border p-3">
      <fieldset disabled={disabled}>
        <input name="id" type="hidden" value={kit.id} />
        <p className="mb-3 font-medium text-sm">{kit.name}</p>
        <FieldGrid columns={4}>
          <TextField
            defaultValue={kit.price}
            dir="ltr"
            inputMode="numeric"
            label={t("price")}
            name="price"
          />
          <TextField
            defaultValue={kit.extra_day_price}
            dir="ltr"
            inputMode="numeric"
            label={t("extraDayPrice")}
            name="extraDayPrice"
          />
          <TextField
            defaultValue={kit.deposit}
            dir="ltr"
            inputMode="numeric"
            label={t("depositField")}
            name="deposit"
          />
          <div className="flex items-end justify-between gap-3">
            <CheckboxField
              defaultChecked={kit.active}
              label={t("offered")}
              name="active"
            />
            {disabled ? null : (
              <SubmitButton size="sm">{tCommon("save")}</SubmitButton>
            )}
          </div>
        </FieldGrid>
      </fieldset>
    </ActionForm>
  );
};

/** Adds a unit of a kit, The IDEA's own or a supplier shop's. */
export const AddKitUnitForm = ({
  kits,
  suppliers,
}: {
  readonly kits: { id: string; name: string }[];
  readonly suppliers: readonly SupplierOption[];
}) => {
  const t = useTranslations("admin.rentals.kits");
  return (
    <ActionForm action={addKitUnit} className="rounded-md border p-3">
      <FieldGrid columns={suppliers.length > 1 ? 4 : 3}>
        <SelectField
          label={t("kit")}
          name="kit"
          options={kits.map((kit) => ({ label: kit.name, value: kit.id }))}
        />
        <TextField label={t("unitLabel")} name="label" required />
        {suppliers.length > 1 ? (
          <SelectField
            label={t("supplier")}
            name="sellerId"
            options={suppliers.map((row) => ({
              label: row.name,
              value: row.id,
            }))}
          />
        ) : null}
        <div className="flex items-end">
          <SubmitButton size="sm">{t("addUnit")}</SubmitButton>
        </div>
      </FieldGrid>
    </ActionForm>
  );
};

/** Sends a unit to repair or retires it, and who owns it. */
export const KitUnitStatus = ({
  id,
  sellerId,
  status,
  suppliers,
}: {
  readonly id: string;
  readonly sellerId: string;
  readonly status: string;
  readonly suppliers: readonly SupplierOption[];
}) => {
  const t = useTranslations("admin.rentals.kits");
  return (
    <ActionForm
      action={setKitUnitStatus}
      className="flex items-center justify-end gap-2"
    >
      <input name="id" type="hidden" value={id} />
      {suppliers.length > 1 && suppliers.some((row) => row.id === sellerId) ? (
        <select
          aria-label={t("supplier")}
          className="h-8 rounded-md border bg-transparent px-2 text-sm"
          defaultValue={sellerId}
          name="sellerId"
        >
          {suppliers.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      ) : null}
      <select
        aria-label={t("unitStatus")}
        className="h-8 rounded-md border bg-transparent px-2 text-sm"
        defaultValue={status}
        name="status"
      >
        {(["active", "repair", "retired"] as const).map((value) => (
          <option key={value} value={value}>
            {t(`units.${value}`)}
          </option>
        ))}
      </select>
      <SubmitButton size="sm" variant="outline">
        {t("set")}
      </SubmitButton>
    </ActionForm>
  );
};
