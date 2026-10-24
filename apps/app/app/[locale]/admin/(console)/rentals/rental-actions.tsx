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
} from "./actions";

interface RentalActionsProps {
  /** Today + 14 days, the usual loan period. */
  readonly defaultDue: string;
  /** The current due date as YYYY-MM-DD in Baghdad, if any. */
  readonly due: string;
  readonly id: string;
  readonly status: RentalStatus;
}

/** Deliver, cancel, return or move the due date of one rental. */
export const RentalActions = ({
  defaultDue,
  due,
  id,
  status,
}: RentalActionsProps) => {
  const t = useTranslations("admin.rentals");

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
      </div>
    );
  }

  return null;
};
