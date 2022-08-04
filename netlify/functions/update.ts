import { panel, reshape, splitArray, toUnicode } from '@components/shard'
import { newUser, pagiQuery, banreq  } from '@components/fauna'
import {compare, format} from "@components/nlp"
import { Telegraf, Markup, Scenes, session } from 'telegraf'
import { Handler } from "@netlify/functions";
import { readFileSync } from 'node:fs';
// use the cache to declare 

if (process.env.TOKEN === undefined) throw new TypeError('BOT_TOKEN must be provided')
  
const bot = new Telegraf<Scenes.SceneContext>(process.env.TOKEN)

bot.start(async ctx => {

	let {first_name, last_name, username, id}  = ctx.from

	if (username === undefined) {
		username = '$-' + first_name + (last_name === undefined)? '': last_name!
		username += '/' + toUnicode(username!)
	} 

	newUser(id,  {
		id,
		username,
		banned: false,
		status : 'user',
		ban_request : false,
		signed_to_newsletter: true,
		name : first_name + ' ' + last_name
	})

	ctx.reply(...panel)

}) 
bot.hears("Unban request؜", async ctx => {

	ctx.deleteMessage(ctx.message.message_id)
		if (await banreq(ctx.from.id)) {
			ctx.scene.enter('banroom')
		}
		else ctx.reply('you are not banned', {disable_notification : true})

})

const banroom = new Scenes.BaseScene<Scenes.SceneContext>('banroom')
banroom.enter(ctx => ctx.reply('send a unban request message'))
banroom.on('text', ctx => {
	ctx.reply('not here yet, tho your need is known')
	ctx.scene.leave()
})

const FAQsub = ['General؜', 'Education؜', 'Sources؜', 'About the post؜']
bot.hears('FAQ page؜', ctx => {
	ctx.deleteMessage(ctx.message.message_id)
	ctx.reply( 'pick your question',
		Markup.keyboard(
			[
				FAQsub.slice(0,2),
				FAQsub.slice(2)
			]
		).resize(true)
	)
})

bot.hears(FAQsub, async ctx => {
	const [que, ans] = splitArray(
		(await pagiQuery<string[][]>('by_subject', ctx.match[0].replace('؜', '')))
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
const pins = JSON.parse(readFileSync('resources/pin.json', 'utf8'))
bot.hears('Pin؜', ctx => {
	ctx.reply('heres your pins',
	Markup.keyboard(
		reshape(Object.keys(pins), 2)
	))
	ctx.deleteMessage(ctx.message.message_id)
})
bot.hears(Object.keys(pins), ctx => ctx.reply('not here yet', panel[1]))

bot.command('/ban', async ctx => {

	let [__, username ] = ctx.message.text.split(' ')
	if (!/@/.test(username)) username = '@$-' + username + '/'+ toUnicode(username)

	const {status} = await ctx.getChatMember(ctx.from.id)
	if ( status === 'administrator' || status === 'creator' ) {
		const holder = await pagiQuery<[number]>('by_username', username.slice(1))

		ctx.banChatMember(holder[0])
	} else ctx.reply("nothing happened", {reply_to_message_id : ctx.message.message_id})

})

const words: format = JSON.parse(readFileSync('resources/banned-words.json', 'utf8'))
bot.on("text", ctx => {
	const {text, message_id, from} = ctx.message
	const {username} = from
	if (compare(text, words)) {
		ctx.deleteMessage(message_id)
		ctx.reply('thats a bad word kiddo.\n' + username + ", keep that kind of stuff out of here")
	}
})
const stage = new Scenes.Stage<Scenes.SceneContext>([banroom], { ttl: 10 })
bot.use(session()); // still needed to use scenes 
bot.use(stage.middleware())

// serverless funcition 
export const handler : Handler = async event => {
	try {
		if (event.body === null) throw new TypeError()
		await bot.handleUpdate(JSON.parse(event.body));
		return { statusCode: 200, body: 'not important' };
	} catch (e) {
	  console.log(e)
	  return { statusCode: 400, body: 'This endpoint is meant for bot and telegram communication' };
	}  
}

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