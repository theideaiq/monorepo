"use client";

import type { Tables } from "@repo/database";
import { useTranslations } from "next-intl";
import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  FieldGrid,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { deleteChat, deleteFaq, saveChat, saveFaq } from "../actions";

/**
 * A group or channel Droid is an admin of, who it lets in on a join
 * request (anyone, members with a linked The IDEA Pass, or a Bulbs tier),
 * and the forum topics it posts news, events and new arrivals to.
 */
export const ChatForm = ({
  chat,
  disabled = false,
}: {
  readonly chat?: Tables<"telegram_chats">;
  readonly disabled?: boolean;
}) => {
  const t = useTranslations("admin.telegram.chats");
  const tCommon = useTranslations("admin.common");

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
      <ActionForm
        action={saveChat}
        className="flex flex-1 flex-wrap items-end gap-3"
      >
        {chat ? (
          <input name="id" type="hidden" value={String(chat.id)} />
        ) : (
          <input name="isNew" type="hidden" value="true" />
        )}
        {chat ? (
          <div className="grid gap-2">
            <span className="font-medium text-sm">{t("id")}</span>
            <code className="py-2 text-sm" dir="ltr">
              {chat.id}
            </code>
          </div>
        ) : (
          <TextField
            dir="ltr"
            hint={t("idHint")}
            label={t("id")}
            name="id"
            wrapperClassName="w-44"
          />
        )}
        <TextField
          defaultValue={chat?.title}
          disabled={disabled}
          label={t("title")}
          maxLength={200}
          name="title"
          wrapperClassName="min-w-40 flex-1"
        />
        <TextField
          defaultValue={chat?.username ?? ""}
          dir="ltr"
          disabled={disabled}
          label={t("username")}
          maxLength={64}
          name="username"
          wrapperClassName="w-40"
        />
        <SelectField
          defaultValue={chat?.join_rule ?? "open"}
          disabled={disabled}
          label={t("joinRule")}
          name="joinRule"
          options={(["open", "pass", "plus"] as const).map((value) => ({
            label: t(`joinRules.${value}`),
            value,
          }))}
          wrapperClassName="w-44"
        />
        {(["news", "events", "arrivals"] as const).map((kind) => (
          <TextField
            defaultValue={chat?.[`${kind}_topic`] ?? ""}
            dir="ltr"
            disabled={disabled}
            hint={t("topicHint")}
            inputMode="numeric"
            key={kind}
            label={t(`topics.${kind}`)}
            name={`${kind}Topic`}
            wrapperClassName="w-32"
          />
        ))}
        <SelectField
          defaultValue={chat?.post_locale ?? "ar"}
          disabled={disabled}
          label={t("postLocale")}
          name="postLocale"
          options={(["ar", "en"] as const).map((value) => ({
            label: t(`postLocales.${value}`),
            value,
          }))}
          wrapperClassName="w-32"
        />
        {disabled ? null : (
          <SubmitButton variant={chat ? "secondary" : "default"}>
            {chat ? tCommon("save") : tCommon("add")}
          </SubmitButton>
        )}
      </ActionForm>
      {chat && !disabled ? (
        <ActionButton
          action={deleteChat}
          confirm={{ title: tCommon("deleteConfirm") }}
          fields={{ id: String(chat.id) }}
          size="default"
          variant="ghost"
        >
          {tCommon("delete")}
        </ActionButton>
      ) : null}
    </div>
  );
};

const topics = ["general", "store", "plus", "club", "business"] as const;

/** A question and answer the bot offers in private chats. */
export const FaqForm = ({
  disabled = false,
  entry,
}: {
  readonly disabled?: boolean;
  readonly entry?: Tables<"telegram_faq">;
}) => {
  const t = useTranslations("admin.telegram.faq");
  const tCommon = useTranslations("admin.common");

  return (
    <div className="grid gap-3 rounded-md border p-4">
      <ActionForm action={saveFaq}>
        {entry ? <input name="id" type="hidden" value={entry.id} /> : null}
        <fieldset className="grid gap-4" disabled={disabled}>
          <FieldGrid>
            <SelectField
              defaultValue={entry?.topic ?? "general"}
              label={t("topic")}
              name="topic"
              options={topics.map((value) => ({
                label: t(`topics.${value}`),
                value,
              }))}
            />
            <TextField
              defaultValue={entry?.position ?? 0}
              dir="ltr"
              hint={tCommon("positionHint")}
              inputMode="numeric"
              label={tCommon("position")}
              name="position"
            />
            <TextField
              defaultValue={entry?.question_ar}
              dir="rtl"
              label={t("questionAr")}
              maxLength={200}
              name="questionAr"
            />
            <TextField
              defaultValue={entry?.question_en}
              dir="ltr"
              label={t("questionEn")}
              maxLength={200}
              name="questionEn"
            />
            <TextareaField
              defaultValue={entry?.answer_ar}
              dir="rtl"
              label={t("answerAr")}
              maxLength={4000}
              name="answerAr"
              rows={4}
            />
            <TextareaField
              defaultValue={entry?.answer_en}
              dir="ltr"
              label={t("answerEn")}
              maxLength={4000}
              name="answerEn"
              rows={4}
            />
          </FieldGrid>
          {disabled ? null : (
            <div className="flex justify-end">
              <SubmitButton variant={entry ? "secondary" : "default"}>
                {entry ? tCommon("save") : tCommon("add")}
              </SubmitButton>
            </div>
          )}
        </fieldset>
      </ActionForm>
      {entry && !disabled ? (
        <div className="flex justify-end">
          <ActionButton
            action={deleteFaq}
            confirm={{ title: tCommon("deleteConfirm") }}
            fields={{ id: entry.id }}
            variant="ghost"
          >
            {tCommon("delete")}
          </ActionButton>
        </div>
      ) : null}
    </div>
  );
};
