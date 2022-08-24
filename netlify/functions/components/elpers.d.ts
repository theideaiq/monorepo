import { Scenes } from "telegraf";
import { ChatMemberAdministrator, InlineKeyboardButton } from "typegram";

export declare interface user {
  id: number;
  status?:
    | "administrator"
    | "creator"
    | "member"
    | "restricted"
    | "left"
    | "kicked";
  banned: boolean;
  username?: string;
  signed_to_newsletter?: string;
}
export declare interface schema<T> {
  ref: unknown;
  tss: number;
  data: T;
}
export declare interface cacheUser extends user {
  messages: number[];
  last: string;
  chat_id: number;
  count: number;
}
export declare interface mine extends Scenes.SceneContext {
  status?: user["status"];
}
export declare type rights = ChatMemberAdministrator;
export interface english {
  [key: string]: string[];
}
export interface arabic {
  [key: string]: string[];
}
export declare interface format {
  english: english;
  arabic: arabic;
  chinese: string[];
}
export declare interface tokens {
  langCode: "english" | "arabic" | "chinese" | "none";
  tokens: (string | undefined)[];
}
export declare type tokenize = Generator<tokens, void, unknown>;
declare type Hideable<B> = B & {
  hide: boolean;
};
export type pinholder = [
  string,
  Hideable<InlineKeyboardButton.UrlButton>[][]
][];
