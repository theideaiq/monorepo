import { cache, Secache, panel, reshape, splitArray, toUnicode } from '@components/shard'
import { banreq, newUser, pagiQuery, userWCache  } from '@components/fauna'
import compare from "@components/nlp"
import { Telegraf, Markup, Scenes, session, } from 'telegraf'

import { Handler } from "@netlify/functions";


if (process.env.TOKEN === undefined) throw new TypeError('BOT_TOKEN must be provided')
interface mine extends Scenes.SceneContext {
	status? : string
}

const bot = new Telegraf<mine>(process.env.TOKEN)
const banroom = new Scenes.BaseScene<mine>('banroom') // scenes work as a sort of private room inside of the bot <):^)
const stage = new Scenes.Stage<mine>([banroom], { ttl: 10 })

bot.use(session()); // still needed to use scenes 
bot.use(stage.middleware())
bot.use(async (ctx, next) => {
	const {from} = ctx
	if (from !== undefined) {
		let {status} = await ctx.getChatMember(from.id)
		ctx.status = status 
	}
	const date = ctx.message?.date
	if (date === undefined) return next()
	switch (ctx.updateType) {
		case 'message':
			if (new Date().getTime() / 1000 - date < 5 * 60) {
        next();
      } else {
        console.log(`Ignoring messages updateType: 'message' from ${ctx.from?.id}`);
      }
	break;
	case 'callback_query':
      if (ctx.callbackQuery?.message && new Date().getTime() / 1000 - ctx.callbackQuery.message.date < 5 * 60) {
        next();
      } else {
        console.log(`Ignoring messages updateType: 'callback_query' from ${ctx.from?.id}`);
      }
      break;
	case 'inline_query':
      return next();
	  default:
		next();
	break
	}
})


bot.start(async ctx => {

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

}) 
// does not work for some reason 
bot.hears("Unban Request؜", ctx => {

	ctx.deleteMessage(ctx.message.message_id)
	return ctx.scene.enter('banroom')

})
banroom.enter(ctx => ctx.reply('send an unban request message'))
banroom.on('text', async ctx => {
	const {text, from} = ctx.message
	if (compare(text, words)) ctx.reply("it seems like you need a different kind of help")
	//todo should be caching this value so we won't spam the db if a person tried to
	else if (await banreq(from.id, text)) {
		ctx.reply('the fox is not here yet, tho your need is known to me')
		
		const holder = await pagiQuery<number>('by-status', "administrator") // index does not exist 		
		const theOne = holder[Math.floor(Math.random() * holder.length)]
		
		ctx.forwardMessage(theOne)

	} else ctx.reply("you are either not banned or lost")
	return ctx.scene.leave()
})

const FAQsub = ['General؜', 'Education؜', 'Sources؜', 'About the post؜']

bot.hears('FAQ؜', ctx => {

	ctx.deleteMessage(ctx.message.message_id)
	ctx.reply( 'pick your question',
		Markup.keyboard(
			[
				FAQsub.slice(0,2),
				FAQsub.slice(2),
				["back"],
				
			]
		).resize(true)
	)
})

// fixme broke after switching to typesciprt idk why gonna fix it by using the cache
// todo still does not work
bot.hears(FAQsub, async ctx => {
	const [que, ans] = splitArray(
			await pagiQuery<string[]>('by_subject', ctx.match[0].replace('؜', ''))
		)

		ctx.reply('here you go',
			Markup.keyboard(		
				reshape(que, 3)
			).resize(true)
		)
		
		bot.hears(que, ctx => {

			ctx.reply(ans[que.indexOf(ctx.match[0])], panel[1])
			ctx.deleteMessage(ctx.message.message_id)

		})			
})
bot.hears('Links؜', ctx => {
	ctx.reply('here you go', 
		{ reply_markup: {
			inline_keyboard: [
				['Website','https://t.me/thepostiq'],
				['The Post Office','https://t.me/thepostofficeiq'],
				['Art Club','https://t.me/artclubiq'],
				['Instagram','https://instagram.com/thepostiq'],
				["Art Club Instagram",'https://instagram.com/artclubiq'],
				['Linkedin','https://linkedin.com/company/thepostproject'],
				['Facebook','https://web.facebook.com/thepostiq'],
				['Twitter','https://twitter.com/thepostiq']
			].map(([el, ln]) => [Markup.button.url(el, ln)])
		}}
	)
	ctx.deleteMessage(ctx.message.message_id)

})
import pi from "@resources/pin.json"
const pins = <Record<string, Record<string, string|Record<string, string>>>>pi

bot.hears('Pin؜', ctx => {
	
	ctx.reply('heres your pins',
		Markup.keyboard(
			reshape([...Object.keys(pins), "المصادر؜", "back"], 2)
	))
	ctx.deleteMessage(ctx.message.message_id)
})

bot.hears("المصادر؜", ctx => {
	ctx.reply(`لستة رح نظل نحدثها باكثر واهم المصادر الي نستخدمها احنا بالبوست:
	- @munahiraqi (https://t.me/joinchat/U8sSDHfww7sm5JBK)
	- @applyformeAFM (https://t.me/+cDbDEM9q069jZjky)
	- @thekhana
	- @thestation_baghdad
	- @iylep2021Q
	- @uwc_iraq (@uwc2021)
	- @thegrinders10 (@TGY10)
	- @codergirl21
	- @teamx70 (@TeamXGroup)`)
})

bot.hears(Object.keys(pins), async ctx => {
	const pin = pins[ctx.match[0]]
	const keys = Object.keys(pin)
	const keypins = []
	for (const el of keys) {
		const pi = pin[el] 	
		if (typeof pi === 'string') keypins.push([Markup.button.url(el, pi)])
		else { 
			keypins.push([Markup.button.url(el, '')]) // [[before], [this], [many, stuff, here], [after]] 
			keypins.push(Object.keys(pi).map(key => {
				const keypi = pi[key];
				return Markup.button.url(key, keypi)
				}
			))
		}
	}
	ctx.reply("here you go", Markup.inlineKeyboard(keypins))
})

bot.hears("back", ctx => ctx.reply('back you go', panel[1]))

bot.command('/ban', async ctx => {

	const {status, message} = ctx
	let [__, username ] = message.text.split(' ')
	if (!/@/.test(username)) username = '@$-' + username + '/'+ toUnicode(username)
	
	const user = cache.find(el => {
		el.username === username
	})

	if ( status === 'administrator' || status === 'creator' ) {
		const holder = (user !== undefined)? user.id :(await pagiQuery<number>('by_username', username.slice(1)))[0]
		
		ctx.banChatMember(holder)
	} else ctx.reply("nothing happened", {reply_to_message_id : message.message_id})

})


import words from "@resources/banned-words.json"
bot.on("text", async (ctx, next) => {
	const {message, status} = ctx
	const {text, message_id, from, chat} = message
	let {username, id, first_name, last_name} = from
	const {id : chat_id, type} = chat

	if (username === undefined) {
		username = '$-' + first_name + (last_name === undefined)? '': last_name
		username += '/' + toUnicode(username!)
	} 
	
	if (!cache.has(id)) {
		if (type === "supergroup")
			userWCache(id, {
				id,
				status,
				username,
			})
		cache.set(id, {
			id,
			status,
			username,
			
			chat_id,
			last: text,
			count: 0,
			messages : [], 
		})
	}
	if (compare(text, words)) {
		try {ctx.deleteMessage(message_id)}
		catch (e) {console.log(e)}
	} 
	const user = cache.get(id)
	
	if (user!.count! > 3 && user!.last === text){
		for await (const msg of user!.messages!) bot.telegram.deleteMessage(user!.chat_id! , msg)
		cache.update(id, {
			messages : []
		})

		if (ctx.chat.type === "supergroup")
			ctx.reply(username +", you have been put in a timeout, go chill a little")
			ctx.restrictChatMember(id, {
				until_date : Math.floor((Date.now() /1000.0) + 350), 
				permissions : {can_send_messages: false, can_send_other_messages: false}
			})
	}
	else if (user!.last === text && user!.chat_id === chat_id) {
		user!.messages!.push(message_id)
		cache.update(id,
			{
				count : user!.count! +1,
				messages : user!.messages!
			}
		)
	} else {
		user!.messages = []
		user!.messages.push(message_id)
		cache.update(id ,
			{
				last : text,
				chat_id : chat_id,
				messages: user!.messages!,
				count : 0 
			}
		)
		next()
	}
})

// serverless funcition 
const handler : Handler = async event => {
	try {
		if (event.body === null) throw new TypeError()
		await bot.handleUpdate(JSON.parse(event.body));
		return { statusCode: 200, body: '' };
	} catch (e) {
	  console.log(e)
	  return { statusCode: 400, body: 'This endpoint is meant for bot and telegram communication' };
	}  
}
export {handler}
/* for server webhooks 
bot.launch({
	webhook: {
		domain: 'url direction',
		port: 'port number' look at the telegram bot api for the available ones 
	}
})
*/

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))