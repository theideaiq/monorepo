"use client";

import type { Tables } from "@repo/database";
import { useTranslations } from "next-intl";
import {
  ActionForm,
  FormError,
  SubmitButton,
} from "@/components/admin/action-form";
import {
  CheckboxField,
  FieldGrid,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { toBaghdadInput } from "@/lib/admin/dates";
import {
  dealKinds,
  dealStages,
  IQD_STEP,
  touchChannels,
} from "@/lib/admin/partner-crm";
import {
  logPartnerTouch,
  savePartnerDeal,
  savePartnerPerson,
} from "../actions";

/** A work contact: name, role, work email and phone, and where it came from. */
export const PersonForm = ({
  orgId,
  person,
}: {
  readonly orgId: string;
  readonly person?: Tables<"partner_people">;
}) => {
  const t = useTranslations("admin.partnerCrm.people");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm action={savePartnerPerson} resetOnSuccess={!person}>
      <input name="orgId" type="hidden" value={orgId} />
      {person ? <input name="id" type="hidden" value={person.id} /> : null}
      <FieldGrid>
        <TextField
          defaultValue={person?.name}
          label={t("name")}
          maxLength={200}
          name="name"
          required
        />
        <TextField
          defaultValue={person?.role ?? ""}
          label={t("role")}
          maxLength={200}
          name="role"
        />
        <TextField
          defaultValue={person?.email ?? ""}
          dir="ltr"
          hint={t("emailHint")}
          label={t("email")}
          maxLength={254}
          name="email"
          type="email"
        />
        <TextField
          defaultValue={person?.phone ?? ""}
          dir="ltr"
          label={t("phone")}
          maxLength={30}
          name="phone"
          type="tel"
        />
        <TextField
          defaultValue={person?.source ?? ""}
          hint={t("sourceHint")}
          label={t("source")}
          maxLength={300}
          name="source"
          required
          wrapperClassName="sm:col-span-2"
        />
        <TextareaField
          defaultValue={person?.notes ?? ""}
          label={tCommon("notes")}
          maxLength={2000}
          name="notes"
          rows={2}
          wrapperClassName="sm:col-span-2"
        />
      </FieldGrid>
      <FormError />
      <div className="flex justify-end">
        <SubmitButton size="sm">
          {person ? tCommon("save") : t("add")}
        </SubmitButton>
      </div>
    </ActionForm>
  );
};

/**
 * Logs a touch (channel, which way, when, with whom, what was said), and
 * offers to set the next action, or to clear it once it's done.
 */
export const TouchForm = ({
  hasNextAction,
  orgId,
  people,
}: {
  readonly hasNextAction: boolean;
  readonly orgId: string;
  readonly people: readonly { id: string; name: string }[];
}) => {
  const t = useTranslations("admin.partnerCrm.activity");
  const tCrm = useTranslations("admin.partnerCrm");

  return (
    <ActionForm action={logPartnerTouch} resetOnSuccess>
      <input name="orgId" type="hidden" value={orgId} />
      <FieldGrid columns={4}>
        <SelectField
          defaultValue="email"
          label={t("channel")}
          name="channel"
          options={touchChannels.map((channel) => ({
            label: t(`channels.${channel}`),
            value: channel,
          }))}
        />
        <SelectField
          defaultValue="outbound"
          label={t("direction")}
          name="direction"
          options={[
            { label: t("outbound"), value: "outbound" },
            { label: t("inbound"), value: "inbound" },
          ]}
        />
        <TextField
          defaultValue={toBaghdadInput(new Date().toISOString())}
          label={t("when")}
          name="happenedAt"
          required
          type="datetime-local"
        />
        <SelectField
          defaultValue=""
          label={t("withWhom")}
          name="personId"
          options={[
            { label: t("noOne"), value: "" },
            ...people.map((person) => ({
              label: person.name,
              value: person.id,
            })),
          ]}
        />
        <TextareaField
          label={t("summary")}
          maxLength={2000}
          name="summary"
          required
          rows={3}
          wrapperClassName="sm:col-span-2 lg:col-span-4"
        />
      </FieldGrid>
      <fieldset className="grid gap-3 rounded-md border p-3">
        <legend className="px-1 font-medium text-sm">{t("nextTitle")}</legend>
        <p className="text-muted-foreground text-xs">{t("nextHint")}</p>
        <FieldGrid columns={3}>
          <TextField
            label={tCrm("fields.nextAction")}
            maxLength={300}
            name="nextAction"
            wrapperClassName="sm:col-span-2"
          />
          <TextField
            label={tCrm("fields.nextActionOn")}
            name="nextActionOn"
            type="date"
          />
        </FieldGrid>
        {hasNextAction ? (
          <CheckboxField label={t("clearNext")} name="clearNextAction" />
        ) : null}
      </fieldset>
      <FormError />
      <div className="flex justify-end">
        <SubmitButton>{t("log")}</SubmitButton>
      </div>
    </ActionForm>
  );
};

/**
 * A deal: what, which kind, its stage, the value in IQD (steps of 250),
 * when it's expected and the opportunity it is about, if any.
 */
export const DealForm = ({
  deal,
  opportunities,
  orgId,
}: {
  readonly deal?: Tables<"partner_deals">;
  readonly opportunities: readonly { id: string; title: string }[];
  readonly orgId: string;
}) => {
  const t = useTranslations("admin.partnerCrm.deals");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm action={savePartnerDeal} resetOnSuccess={!deal}>
      <input name="orgId" type="hidden" value={orgId} />
      {deal ? <input name="id" type="hidden" value={deal.id} /> : null}
      <FieldGrid columns={3}>
        <TextField
          defaultValue={deal?.title}
          label={t("title")}
          maxLength={200}
          name="title"
          required
          wrapperClassName="sm:col-span-2 lg:col-span-3"
        />
        <SelectField
          defaultValue={deal?.kind ?? "delegation"}
          label={t("kind")}
          name="kind"
          options={dealKinds.map((kind) => ({
            label: t(`kinds.${kind}`),
            value: kind,
          }))}
        />
        <SelectField
          defaultValue={deal?.stage ?? "idea"}
          label={t("stage")}
          name="stage"
          options={dealStages.map((stage) => ({
            label: t(`stages.${stage}`),
            value: stage,
          }))}
        />
        <TextField
          defaultValue={deal?.value_iqd ?? ""}
          dir="ltr"
          hint={t("valueHint")}
          inputMode="numeric"
          label={t("value")}
          min={0}
          name="valueIqd"
          step={IQD_STEP}
          type="number"
        />
        <TextField
          defaultValue={deal?.expected_on ?? ""}
          label={t("expectedOn")}
          name="expectedOn"
          type="date"
        />
        <SelectField
          defaultValue={deal?.opportunity_id ?? ""}
          label={t("opportunity")}
          name="opportunityId"
          options={[
            { label: t("noOpportunity"), value: "" },
            ...opportunities.map((opportunity) => ({
              label: opportunity.title,
              value: opportunity.id,
            })),
          ]}
          wrapperClassName="sm:col-span-2"
        />
        <TextareaField
          defaultValue={deal?.notes ?? ""}
          label={tCommon("notes")}
          maxLength={4000}
          name="notes"
          rows={2}
          wrapperClassName="sm:col-span-2 lg:col-span-3"
        />
      </FieldGrid>
      <FormError />
      <div className="flex justify-end">
        <SubmitButton size="sm">
          {deal ? tCommon("save") : t("add")}
        </SubmitButton>
      </div>
    </ActionForm>
  );
};
