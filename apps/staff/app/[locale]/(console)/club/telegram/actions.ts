"use server";

import { z } from "zod";
import {
  ActionFailure,
  affected,
  check,
  staffAction,
} from "@/lib/admin/action";
import { type ActionError, success } from "@/lib/admin/action-state";
import { callApi } from "@/lib/admin/api";
import {
  checkbox,
  choice,
  int,
  optionalInt,
  optionalText,
  optionalUuid,
  text,
  uuid,
} from "@/lib/admin/forms";

/** Resolves (e.g. grants an unban) or rejects a request sent to the bot. */
export const resolveRequest = staffAction(
  "telegram",
  z.object({ id: uuid, status: z.enum(["resolved", "rejected", "open"]) }),
  async ({ input, staff, supabase }) => {
    affected(
      await supabase
        .from("telegram_requests")
        .update({
          resolved_by: input.status === "open" ? null : staff.userId,
          status: input.status,
        })
        .eq("id", input.id)
        .select("id")
    );
  }
);

const AT_PREFIX = /^@/;
const CHAT_ID = /^-?\d{1,20}$/;

/** A forum topic's thread id; 0 for the chat itself, empty for none. */
const topic = optionalInt(0, 2_147_483_647);

export const saveChat = staffAction(
  "telegram",
  z.object({
    arrivalsTopic: topic,
    eventsTopic: topic,
    id: z.string().trim().regex(CHAT_ID),
    isNew: checkbox,
    joinRule: choice(["open", "pass", "plus"] as const),
    newsTopic: topic,
    postLocale: choice(["ar", "en"] as const),
    title: text(200),
    username: optionalText(64).transform((value) =>
      value ? value.replace(AT_PREFIX, "") : null
    ),
  }),
  async ({ input, supabase }) => {
    const row = {
      arrivals_topic: input.arrivalsTopic,
      events_topic: input.eventsTopic,
      join_rule: input.joinRule,
      news_topic: input.newsTopic,
      post_locale: input.postLocale,
      title: input.title,
      username: input.username,
    };
    // Chat ids exceed 2^53 in theory; PostgREST takes them as text.
    const id = input.id as unknown as number;
    if (input.isNew) {
      check(await supabase.from("telegram_chats").insert({ ...row, id }));
    } else {
      affected(
        await supabase
          .from("telegram_chats")
          .update(row)
          .eq("id", id)
          .select("id")
      );
    }
    return success();
  }
);

export const deleteChat = staffAction(
  "telegram",
  z.object({ id: z.string().trim().regex(CHAT_ID) }),
  async ({ input, supabase }) => {
    check(
      await supabase
        .from("telegram_chats")
        .delete()
        .eq("id", input.id as unknown as number)
    );
    return success("deleted");
  }
);

const topics = ["general", "store", "plus", "club", "business"] as const;

export const saveFaq = staffAction(
  "telegram",
  z.object({
    answerAr: text(4000),
    answerEn: text(4000),
    id: optionalUuid,
    position: int(0, 10_000),
    questionAr: text(200),
    questionEn: text(200),
    topic: z.enum(topics),
  }),
  async ({ input, supabase }) => {
    const row = {
      answer_ar: input.answerAr,
      answer_en: input.answerEn,
      position: input.position,
      question_ar: input.questionAr,
      question_en: input.questionEn,
      topic: input.topic,
    };
    if (input.id) {
      affected(
        await supabase
          .from("telegram_faq")
          .update(row)
          .eq("id", input.id)
          .select("id")
      );
    } else {
      check(await supabase.from("telegram_faq").insert(row));
    }
    return success();
  }
);

export const deleteFaq = staffAction(
  "telegram",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.from("telegram_faq").delete().eq("id", input.id));
    return success("deleted");
  }
);

const BOT_ERRORS: Record<string, ActionError> = {
  forbidden: "forbidden",
  mfa_required: "forbidden",
  telegram_failed: "telegramFailed",
  unavailable: "apiUnavailable",
  webhook_secret_missing: "telegramSecretMissing",
};

/**
 * Sets Droid up again (apps/api holds the bot token): the webhook, the
 * commands, the Mini App button and the descriptions. Admins only.
 */
export const setUpTelegramBot = staffAction(
  "telegram",
  z.object({}),
  async ({ supabase }) => {
    const result = await callApi(supabase, "/admin/telegram", {
      action: "setup",
    });
    if (!result.ok) {
      throw new ActionFailure(BOT_ERRORS[result.error] ?? "unknown");
    }
    return success();
  }
);
