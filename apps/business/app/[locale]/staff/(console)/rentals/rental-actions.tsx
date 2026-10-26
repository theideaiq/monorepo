"use client";

import type { RentalStatus } from "@repo/database";
import { Input } from "@repo/design-system/components/ui/input";
import { useTranslations } from "next-intl";
import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  cancelRentalRequest,
  changeDueDate,
  deliverRental,
  returnRental,
  settleRental,
} from "./actions";

interface RentalActionsProps {
  /** Today + 14 days, the usual loan period. */
  readonly defaultDue: string;
  /** The current due date as YYYY-MM-DD in Baghdad, if any. */
  readonly due: string;
  readonly id: string;
  /** Rented on its own and not yet settled: settle at return. */
  readonly settle: boolean;
  /** Rented on its own: cancelled with its order, not here. */
  readonly single: boolean;
  readonly status: RentalStatus;
}

/** Settle a single-item rent: damage (if any) comes out of the deposit. */
const SettleForm = ({ id }: { readonly id: string }) => {
  const t = useTranslations("admin.rentals");
  return (
    <ActionForm action={settleRental} className="flex items-center gap-2">
      <input name="id" type="hidden" value={id} />
      <Input
        aria-label={t("damage")}
        className="w-28"
        defaultValue="0"
        dir="ltr"
        inputMode="numeric"
        name="damage"
        placeholder={t("damage")}
      />
      <SubmitButton size="sm">{t("settle")}</SubmitButton>
    </ActionForm>
  );
};

/** Deliver, cancel, return or move the due date of one rental. */
export const RentalActions = ({
  defaultDue,
  due,
  id,
  settle,
  single,
  status,
}: RentalActionsProps) => {
  const t = useTranslations("admin.rentals");

  if (status === "returned") {
    return settle ? <SettleForm id={id} /> : null;
  }

  if (status === "requested") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <ActionForm action={deliverRental} className="flex items-center gap-2">
          <input name="id" type="hidden" value={id} />
          <Input
            aria-label={t("dueDate")}
            className="w-auto"
            defaultValue={defaultDue}
            name="due"
            required
            type="date"
          />
          <SubmitButton size="sm">{t("deliver")}</SubmitButton>
        </ActionForm>
        {single ? null : (
          <ActionButton
            action={cancelRentalRequest}
            confirm={{
              description: t("cancelDescription"),
              title: t("cancelConfirm"),
            }}
            fields={{ id }}
            variant="ghost"
          >
            {t("cancel")}
          </ActionButton>
        )}
      </div>
    );
  }

  if (status === "active" || status === "overdue") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <ActionForm action={changeDueDate} className="flex items-center gap-2">
          <input name="id" type="hidden" value={id} />
          <Input
            aria-label={t("dueDate")}
            className="w-auto"
            defaultValue={due}
            name="due"
            required
            type="date"
          />
          <SubmitButton size="sm" variant="outline">
            {t("changeDue")}
          </SubmitButton>
        </ActionForm>
        <ActionButton action={returnRental} fields={{ id }} variant="default">
          {t("markReturned")}
        </ActionButton>
        {settle ? <SettleForm id={id} /> : null}
      </div>
    );
  }

  return null;
};
