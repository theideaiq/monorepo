import { Scenes } from "telegraf"
import { ChatMemberAdministrator, InlineKeyboardButton } from 'typegram';

export declare interface user  {
	id 		  : number,
	status 	 ?: string,
	banned	  : boolean,
	username ?: string,
}

export declare interface cacheUser {
	id 		  : number,
	status 	 ?: string,
	banned	  : boolean,
	username ?: string,
	messages ?: number[]
	last	  : string,
	chat_id	  : number
	count	 ?: number,
}
export declare interface mine extends Scenes.SceneContext {
	status? : string
}
export declare type rights = ChatMemberAdministrator
export declare type format = { 
	english : Array<string | string[]>;
	arabic  : string[]; 
	chinese : string[]; 
}
declare type Hideable<B> = B & {
    hide : boolean;
};
export type pinholder = [string, Hideable<InlineKeyboardButton.UrlButton>[][]][]