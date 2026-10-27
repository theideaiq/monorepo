"use client";

import { SendIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { ticketTopics } from "@/lib/admin/support";
import { openTicketForCustomer } from "../../support/actions";

/**
 * Opens a support ticket for this customer: the message is sent to them
 * (they're notified) and the ticket waits on their reply.
 */
export const OpenTicketForm = ({
  customerId,
  orders,
}: {
  readonly customerId: string;
  readonly orders: { id: string; number: number }[];
}) => {
  const t = useTranslations("admin.customers.support");
  const tSupport = useTranslations("admin.support");

  return (
    <ActionForm action={openTicketForCustomer}>
      <input name="customerId" type="hidden" value={customerId} />
      <TextField label={t("subject")} maxLength={200} name="subject" required />
      <SelectField
        defaultValue="other"
        label={tSupport("topic")}
        name="topic"
        options={ticketTopics.map((topic) => ({
          label: tSupport(`topics.${topic}`),
          value: topic,
        }))}
      />
      {orders.length > 0 ? (
        <SelectField
          defaultValue=""
          label={tSupport("order")}
          name="orderId"
          options={[
            { label: tSupport("noOrder"), value: "" },
            ...orders.map((order) => ({
              label: `#${order.number}`,
              value: order.id,
            })),
          ]}
        />
      ) : null}
      <TextareaField
        hint={t("messageHint")}
        label={t("message")}
        maxLength={5000}
        name="body"
        required
        rows={4}
      />
      <SubmitButton>
        <SendIcon className="rtl:-scale-x-100" />
        {t("open")}
      </SubmitButton>
    </ActionForm>
  );
};
