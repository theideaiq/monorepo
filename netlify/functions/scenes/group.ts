import { mine, rights } from "@components/elpers"
import { pagiQuery, userWCache } from "@components/fauna"
import { cache, toUnicode, panel } from "@components/shard"
import { Scenes } from "telegraf"
import compare from "@components/nlp"

export const groupChat = new Scenes.BaseScene<mine>('group') 

groupChat.command('/ban', async (ctx, next) => {

	const {status, message} = ctx
	let [__, username ] = message.text.split(' ')
	if (!/@/.test(username)) username = '@$-' + username + '/'+ toUnicode(username)
	
	const user = cache.find(el => el.username === username)

	if ( status === 'administrator' || status === 'creator' ) {
		const holder = (user !== undefined)? user.id :(await pagiQuery<number>('by_username', username.slice(1)))[0]
		
		return await ctx.banChatMember(holder)
	} ctx.reply("nothing happened", {reply_to_message_id : message.message_id})
	return await next()
})

import words from "@resources/banned-words.json"
groupChat.hears("wake me up؜", async (ctx, next) => {
	if (ctx.chat.type === "private") {
		ctx.reply("hello again",panel[1])
		return ctx.scene.enter("private")
	} return await next()
})

groupChat.on("text", async (ctx, next) => {
	if (ctx.chat?.type === "private") {
		ctx.reply(...panel)
		return ctx.scene.enter("private")
	}
	const {message, status, botInfo} = ctx
	const {text, message_id, from, chat} = message

	let {username, id, first_name, last_name, } = from
	const {id : chat_id, type} = chat
	const {...rights} = <rights>await ctx.getChatMember(botInfo.id)
	

	if (username === undefined) {
		username = '$-' + first_name + (last_name === undefined)? '': last_name
		username += '/' + toUnicode(username!)
	} 
	
	if (!cache.has(id)) {
			userWCache(id, {
				id,
				status,
				username,
				banned : false
			})
		cache.set(id, {
			id,
			status,
			username,
			banned : false ,
			
			chat_id,
			last: text,
			count: 0,
			messages : [], 
		})
	}
	
	if (compare(text, words) && rights.can_delete_messages) {
		try { return ctx.deleteMessage(message_id)
		} catch (e) {console.log(e)}
	}

	const user = cache.get(id)!
	if (user.last === text && user.chat_id === chat_id) {
		cache.update(id,
			{
				count : user.messages!.push(message_id),
				messages : user.messages
			}
		)
	} if (user.count! > 3 && user.last === text) {
		for (const msg of user.messages!) await ctx.deleteMessage(msg)
		cache.update(id, {
			messages : [],
			count : 0
		})

			ctx.reply(username +", you have been put in a timeout, go chill a little")
			ctx.restrictChatMember(id, {
				until_date : Math.floor((Date.now() /1000.0) + 350), 
				permissions : {can_send_messages: false, can_send_other_messages: false}
			})
	} else {
		cache.update(id,
			{
				last : text,
				chat_id,
				messages: [message_id,],
				count : 0
			}
		)
	}
	return await next()
})