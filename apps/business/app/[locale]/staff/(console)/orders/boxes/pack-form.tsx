"use client";

import { Label } from "@repo/design-system/components/ui/label";
import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { packBox } from "../actions";

export interface PackSlot {
  copies: { id: string; label: string }[];
  id: string;
  name: string;
  /** Copies to pick for this slot (its quantity × the boxes ordered). */
  wanted: number;
}

/** Picks the copies for each slot of an ordered box, then packs it. */
export const PackForm = ({
  id,
  slots,
}: {
  readonly id: string;
  readonly slots: readonly PackSlot[];
}) => {
  const t = useTranslations("admin.orders.boxes");
  return (
    <ActionForm action={packBox} className="grid gap-3">
      <input name="id" type="hidden" value={id} />
      {slots.map((slot) => (
        <div className="grid gap-1" key={slot.id}>
          <Label htmlFor={`slot-${id}-${slot.id}`}>
            {t("pick", { count: String(slot.wanted), name: slot.name })}
          </Label>
          {slot.copies.length === 0 ? (
            <p className="text-destructive text-sm">{t("noCopies")}</p>
          ) : (
            <select
              className="min-h-32 w-full rounded-md border bg-transparent p-2 text-sm"
              id={`slot-${id}-${slot.id}`}
              multiple
              name="picks[]"
              size={Math.min(8, slot.copies.length)}
            >
              {slot.copies.map((copy) => (
                <option key={copy.id} value={copy.id}>
                  {copy.label}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
      <div>
        <SubmitButton size="sm">{t("pack")}</SubmitButton>
      </div>
    </ActionForm>
  );
};
