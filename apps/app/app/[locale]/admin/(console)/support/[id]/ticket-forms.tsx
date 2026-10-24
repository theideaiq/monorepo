"use client";

import { Label } from "@repo/design-system/components/ui/label";
import { Switch } from "@repo/design-system/components/ui/switch";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { cn } from "@repo/design-system/lib/utils";
import { LockIcon, SendIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { SelectField } from "@/components/admin/fields";
import { ticketPriorities, ticketStatuses } from "@/lib/admin/support";
import { replyToTicket, updateTicket } from "../actions";

/** The reply box; the toggle turns the message into a staff-only note. */
export const ReplyForm = ({
  closed,
  ticketId,
}: {
  readonly closed: boolean;
  readonly ticketId: string;
}) => {
  const t = useTranslations("admin.support");
  const [internal, setInternal] = useState(false);
  const id = useId();

  return (
    <ActionForm action={replyToTicket} resetOnSuccess>
      <input name="ticketId" type="hidden" value={ticketId} />
      {internal ? <input name="internal" type="hidden" value="true" /> : null}
      <div className="grid gap-2">
        <Label htmlFor={`${id}-body`}>
          {internal ? t("noteLabel") : t("replyLabel")}
        </Label>
        <Textarea
          className={cn(
            internal &&
              "border-warning/50 bg-warning/5 focus-visible:border-warning"
          )}
          id={`${id}-body`}
          maxLength={5000}
          name="body"
          placeholder={internal ? t("notePlaceholder") : t("replyPlaceholder")}
          required
          rows={5}
        />
        <p className="text-muted-foreground text-xs">
          {internal
            ? t("noteHint")
            : t(closed ? "closedReplyHint" : "replyHint")}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={internal}
            id={`${id}-internal`}
            onCheckedChange={setInternal}
          />
          <Label htmlFor={`${id}-internal`}>{t("internalToggle")}</Label>
        </div>
        <SubmitButton variant={internal ? "secondary" : "default"}>
          {internal ? <LockIcon /> : <SendIcon className="rtl:-scale-x-100" />}
          {internal ? t("addNote") : t("sendReply")}
        </SubmitButton>
      </div>
    </ActionForm>
  );
};

interface ManageFormProps {
  readonly assignedTo: string | null;
  readonly disabled: boolean;
  readonly priority: string;
  readonly status: string;
  readonly team: { id: string; name: string | null }[];
  readonly ticketId: string;
}

/** Status, priority and assignee. */
export const ManageTicketForm = ({
  assignedTo,
  disabled,
  priority,
  status,
  team,
  ticketId,
}: ManageFormProps) => {
  const t = useTranslations("admin.support");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm action={updateTicket}>
      <input name="ticketId" type="hidden" value={ticketId} />
      <fieldset className="grid gap-4" disabled={disabled}>
        <SelectField
          defaultValue={status}
          hint={t("statusHint")}
          label={t("status")}
          name="status"
          options={ticketStatuses.map((value) => ({
            label: t(`statuses.${value}`),
            value,
          }))}
        />
        <SelectField
          defaultValue={priority}
          label={t("priority")}
          name="priority"
          options={ticketPriorities.map((value) => ({
            label: t(`priorities.${value}`),
            value,
          }))}
        />
        <SelectField
          defaultValue={assignedTo ?? ""}
          label={t("assignee")}
          name="assignedTo"
          options={[
            { label: t("unassigned"), value: "" },
            ...team.map((member) => ({
              label: member.name ?? t("unnamedStaff"),
              value: member.id,
            })),
          ]}
        />
        {disabled ? null : (
          <SubmitButton className="w-fit">{tCommon("save")}</SubmitButton>
        )}
      </fieldset>
    </ActionForm>
  );
};
