/**
 * Everything the bot reads or writes in the database, behind one interface so
 * the bot can be tested without Supabase. Production uses
 * `createSupabaseData` with the admin client: the bot is trusted server code
 * and the Telegram tables have no customer policies.
 */
import { listProducts, type ProductCard } from "@repo/commerce/catalog";
import type { Database, Tables } from "@repo/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TelegramMember = Pick<
  Tables<"telegram_members">,
  | "banned_at"
  | "chat_status"
  | "first_name"
  | "id"
  | "language_code"
  | "last_name"
  | "newsletter_opt_in"
  | "username"
>;

export type MemberProfile = Pick<
  TelegramMember,
  "first_name" | "id" | "language_code" | "last_name" | "username"
>;

export type TelegramChat = Pick<
  Tables<"telegram_chats">,
  "id" | "moderated" | "title" | "username"
>;

export type FaqEntry = Pick<
  Tables<"telegram_faq">,
  "answer_ar" | "answer_en" | "id" | "question_ar" | "question_en" | "topic"
>;

export type FaqTopic = "academy" | "general" | "plus" | "store" | "suite";

export interface DroidData {
  createRequest: (
    memberId: number,
    type: "support" | "unban",
    message: string
  ) => Promise<void>;
  /** Latest-first lookup by @username (case-insensitive, without "@"). */
  findMemberByUsername: (username: string) => Promise<TelegramMember | null>;
  /** The chat, or null when the bot never registered it. */
  getChat: (chatId: number) => Promise<TelegramChat | null>;
  getFaq: (id: string) => Promise<FaqEntry | null>;
  getMember: (id: number) => Promise<TelegramMember | null>;
  hasOpenRequest: (
    memberId: number,
    type: "support" | "unban"
  ) => Promise<boolean>;
  listFaq: (topic?: FaqTopic) => Promise<FaqEntry[]>;
  listModeratedChats: () => Promise<TelegramChat[]>;
  /** Members who opted into the newsletter and aren't banned. */
  listNewsletterMembers: (
    offset: number,
    limit: number
  ) => Promise<Pick<TelegramMember, "id" | "language_code">[]>;
  /** Registers a chat (new chats are moderated) or refreshes its title. */
  saveChat: (chat: Omit<TelegramChat, "moderated">) => Promise<void>;
  searchProducts: (query: string, limit: number) => Promise<ProductCard[]>;
  /** Records a member's status in a moderated group. */
  setMemberStatus: (
    member: MemberProfile,
    status: string,
    banned: boolean | undefined
  ) => Promise<void>;
  setNewsletter: (memberId: number, optIn: boolean) => Promise<void>;
  upsertMember: (member: MemberProfile) => Promise<void>;
}

const LIKE_WILDCARDS = /[%_\\]/g;

const check = ({ error }: { error: { message: string } | null }) => {
  if (error) {
    throw new Error(error.message);
  }
};

const MEMBER_COLUMNS =
  "id, username, first_name, last_name, language_code, chat_status, banned_at, newsletter_opt_in" as const;

export const createSupabaseData = (
  supabase: SupabaseClient<Database>
): DroidData => ({
  async createRequest(memberId, type, message) {
    check(
      await supabase
        .from("telegram_requests")
        .insert({ member_id: memberId, message, type })
    );
  },

  async findMemberByUsername(username) {
    const { data, error } = await supabase
      .from("telegram_members")
      .select(MEMBER_COLUMNS)
      .ilike("username", username.replace(LIKE_WILDCARDS, "\\$&"))
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    check({ error });
    return data;
  },

  async getChat(chatId) {
    const { data, error } = await supabase
      .from("telegram_chats")
      .select("id, title, username, moderated")
      .eq("id", chatId)
      .maybeSingle();
    check({ error });
    return data;
  },

  async getFaq(id) {
    const { data, error } = await supabase
      .from("telegram_faq")
      .select("id, topic, question_ar, question_en, answer_ar, answer_en")
      .eq("id", id)
      .maybeSingle();
    check({ error });
    return data;
  },

  async getMember(id) {
    const { data, error } = await supabase
      .from("telegram_members")
      .select(MEMBER_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    check({ error });
    return data;
  },

  async hasOpenRequest(memberId, type) {
    const { count, error } = await supabase
      .from("telegram_requests")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId)
      .eq("type", type)
      .eq("status", "open");
    check({ error });
    return (count ?? 0) > 0;
  },

  async listFaq(topic) {
    let query = supabase
      .from("telegram_faq")
      .select("id, topic, question_ar, question_en, answer_ar, answer_en")
      .order("position")
      .order("created_at");
    if (topic) {
      query = query.eq("topic", topic);
    }
    const { data, error } = await query.limit(50);
    check({ error });
    return data ?? [];
  },

  async listModeratedChats() {
    const { data, error } = await supabase
      .from("telegram_chats")
      .select("id, title, username, moderated")
      .eq("moderated", true);
    check({ error });
    return data ?? [];
  },

  async listNewsletterMembers(offset, limit) {
    const { data, error } = await supabase
      .from("telegram_members")
      .select("id, language_code")
      .eq("newsletter_opt_in", true)
      .is("banned_at", null)
      .order("id")
      .range(offset, offset + limit - 1);
    check({ error });
    return data ?? [];
  },

  async saveChat(chat) {
    // New chats get the column default (moderated); existing ones keep the
    // setting staff chose.
    check(await supabase.from("telegram_chats").upsert(chat));
  },

  async searchProducts(query, limit) {
    const [sale, rental] = await Promise.all([
      listProducts(supabase, { kind: "sale", limit, search: query }),
      listProducts(supabase, { kind: "rental", limit, search: query }),
    ]);
    return [...sale, ...rental].slice(0, limit);
  },

  async setMemberStatus(member, status, banned) {
    check(
      await supabase.from("telegram_members").upsert({
        ...member,
        chat_status: status,
        ...(banned === undefined
          ? {}
          : { banned_at: banned ? new Date().toISOString() : null }),
      })
    );
  },

  async setNewsletter(memberId, optIn) {
    check(
      await supabase
        .from("telegram_members")
        .update({ newsletter_opt_in: optIn })
        .eq("id", memberId)
    );
  },

  async upsertMember(member) {
    check(await supabase.from("telegram_members").upsert(member));
  },
});
