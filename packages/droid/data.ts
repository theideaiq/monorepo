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

export type FaqTopic = "business" | "club" | "general" | "plus" | "store";

/** One of a member's orders, for "Track my order". */
export type OrderSummary = Pick<
  Tables<"orders">,
  "created_at" | "id" | "number" | "status" | "total"
>;

/** Whether a join request passes the chat's rule (`telegram_join_check`). */
export interface JoinCheck {
  allowed: boolean;
  /** Whether the Telegram account is linked to The IDEA Pass. */
  linked: boolean;
  /** open, pass (linked The IDEA Pass) or plus (and a live Plus plan). */
  rule: string;
}

/** A member's Bulbs: usable now, and still in the return window. */
export interface BulbBalance {
  available: number;
  pending: number;
}

export interface DroidData {
  /** A support request from someone who hasn't linked The IDEA Pass. */
  createRequest: (memberId: number, message: string) => Promise<void>;
  /** A support ticket for a member (on Help); its number. */
  createTicket: (userId: string, message: string) => Promise<number>;
  getBulbs: (userId: string) => Promise<BulbBalance>;
  /** The chat, or null when the bot never registered it. */
  getChat: (chatId: number) => Promise<TelegramChat | null>;
  getFaq: (id: string) => Promise<FaqEntry | null>;
  /** The IDEA Pass member a Telegram account is linked to, if any. */
  getLinkedUser: (memberId: number) => Promise<string | null>;
  getMember: (id: number) => Promise<TelegramMember | null>;
  /** The chat's join rule applied to a Telegram account; null if unknown. */
  joinCheck: (chatId: number, memberId: number) => Promise<JoinCheck | null>;
  listFaq: (topic?: FaqTopic) => Promise<FaqEntry[]>;
  /** Members who opted into the newsletter and aren't banned. */
  listNewsletterMembers: (
    offset: number,
    limit: number
  ) => Promise<Pick<TelegramMember, "id" | "language_code">[]>;
  /** A member's latest orders, newest first. */
  listOrders: (userId: string, limit: number) => Promise<OrderSummary[]>;
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
  async createRequest(memberId, message) {
    check(
      await supabase
        .from("telegram_requests")
        .insert({ member_id: memberId, message, type: "support" })
    );
  },

  async createTicket(userId, message) {
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        subject: message.split("\n")[0]?.slice(0, 80) || "Telegram",
        user_id: userId,
      })
      .select("id, number")
      .single();
    check({ error });
    if (!ticket) {
      throw new Error("The support ticket wasn't created");
    }
    check(
      await supabase
        .from("support_messages")
        .insert({ author_id: userId, body: message, ticket_id: ticket.id })
    );
    return ticket.number;
  },

  async getBulbs(userId) {
    const { data, error } = await supabase
      .from("bulb_entries")
      .select("amount, status, available_at")
      .eq("user_id", userId)
      .neq("status", "void");
    check({ error });
    const now = Date.now();
    let available = 0;
    let pending = 0;
    for (const entry of data ?? []) {
      if (
        entry.status === "pending" &&
        new Date(entry.available_at).getTime() > now
      ) {
        pending += entry.amount;
      } else {
        // Spent, expired and available entries (expiry is a negative entry).
        available += entry.amount;
      }
    }
    return { available: Math.max(0, available), pending };
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

  async getLinkedUser(memberId) {
    const { data, error } = await supabase
      .from("telegram_members")
      .select("user_id")
      .eq("id", memberId)
      .maybeSingle();
    check({ error });
    return data?.user_id ?? null;
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

  async joinCheck(chatId, memberId) {
    const { data, error } = await supabase.rpc("telegram_join_check", {
      chat: chatId,
      member: memberId,
    });
    check({ error });
    const row = data?.[0];
    return row
      ? {
          allowed: row.allowed,
          linked: row.linked,
          rule: row.rule,
        }
      : null;
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

  async listOrders(userId, limit) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, number, status, total, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
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
