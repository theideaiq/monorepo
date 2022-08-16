import { Telegraf, Scenes, session } from 'telegraf'
import { panel, toUnicode } from '@components/shard'
import { newUser } from '@components/fauna'
// types
import { ChatAdministratorRights } from 'typegram'
import { Handler } from "@netlify/functions"
import { mine } from "@components/elpers"
// scenes 
import { privateChat, banroom } from '@scenes/private'
import { groupChat } from '@scenes/group'

if (process.env.TOKEN === undefined) throw new TypeError('BOT_TOKEN must be provided')
// scenes work as a sort of private room inside of the bot 
const bot = new Telegraf<mine>(process.env.TOKEN)
const stage = new Scenes.Stage<mine>([banroom, privateChat, groupChat])

bot.use(session()); // still needed to use scenes 
bot.use(stage.middleware())
bot.use(async (ctx, next) => {
	const {from, chat, botInfo} = ctx
	if (chat?.type === "supergroup") {

		let {status} = await ctx.getChatMember(from!.id)		
		ctx.status = status
		
	}

	const date = ctx.message?.date
	if (date === undefined) return await next()
	const time = new Date().getTime()
	switch (ctx.updateType) {
		case 'message':
	if ( time / 1000 - date < 5 * 60 ) {
		await next()
	} break;
		case 'callback_query':
	if ( ctx.callbackQuery?.message && time / 1000 - ctx.callbackQuery.message.date < 5 * 60 ) {
		await next()
	} break;
		case 'inline_query': return await next()
		default: return await next()
	}
})

bot.start(async (ctx, next) => {
	if (ctx.chat.type !== "private") return await next() ;
	
	let {first_name, last_name, username, id}  = ctx.from
	if (username === undefined) {
		username = '$-' + first_name + (last_name === undefined)? '': last_name!
		username += '/' + toUnicode(username!)
	} 
	
	newUser(id,  {
		id,
		username,
		ban_request : '',
		signed_to_newsletter: true,
	})

	ctx.reply(...panel)
	return ctx.scene.enter("private")
})
bot.on('message', ctx => {
	if (ctx.chat.type === 'private') 
		return ctx.scene.enter("private")
	return ctx.scene.enter("group")
})
privateChat.on('message', async (ctx, next) => {
	if (ctx.chat.type === 'private') return await next()
	
	bot.telegram.sendMessage(ctx.from.id, "goodnight", {
		reply_markup : {keyboard : [['wake me up؜']]},
		disable_notification: true
	})
	return ctx.scene.enter("group")
})

// serverless funcition 
const handler : Handler = async event => {
	try {
		if (event.body === null) throw new TypeError()
		await bot.handleUpdate(JSON.parse(event.body));
		return { statusCode: 200, body: '' };
	} catch (e) {
	console.log(e)
	return { statusCode: 500, body: 'This endpoint is meant for bot and telegram communication' };
	}  
}
export {handler}

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))