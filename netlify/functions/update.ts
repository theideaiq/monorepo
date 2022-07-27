import { panel, reshape, splitArray, toUnicode } from '@components/shard'
import { newUser, pagiQuery, banreq  } from '@components/fauna'
import {compare, format} from "@components/nlp"
import { Telegraf, Markup, Scenes, session } from 'telegraf'
import { Handler } from "@netlify/functions";
import { readFileSync } from 'node:fs';
// use the cache to declare 

if (process.env.TOKEN === undefined) throw new TypeError('BOT_TOKEN must be provided')
  
const bot = new Telegraf<Scenes.SceneContext>(process.env.TOKEN)

bot.use((ctx, next) => {
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


bot.start(async (ctx, next) => {

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

// does not work for some reason 
bot.hears("Unban request؜", async (ctx, next) => {

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

bot.hears('FAQ page؜', (ctx, next) => {

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

bot.hears(FAQsub, async (ctx, next) => {
	const [que, ans] = splitArray(
		(await pagiQuery<string[][]>('by_subject', ctx.match[0].replace('؜', '')))
		)

	ctx.reply('here you go',
		Markup.keyboard(		
			reshape(que, 3)
		).resize(true)
	)
	
	bot.hears(que, (ctx, next) => {

		ctx.reply(ans[que.indexOf(ctx.match[0])], panel[1])
		ctx.deleteMessage(ctx.message.message_id)
	})

})

bot.hears('The post family links؜', (ctx, next) => {
	ctx.reply('here you go', 
		{ reply_markup: {
			inline_keyboard: [
				['the post website','https://t.me/thepostiq'],
				['the post group','https://t.me/thepostofficeiq'],
				['art club group','https://t.me/artclubiq'],
				['the post instagram','https://instagram.com/thepostiq'],
				["art club instagram",'https://instagram.com/artclubiq'],
				['the post linkedin','https://linkedin.com/company/thepostproject'],
				['the post facebook','https://web.facebook.com/thepostiq'],
				['the post twitter','https://twitter.com/thepostiq']
			].map(([el, ln]) => [Markup.button.url(el, ln)])
		}}
	)
	ctx.deleteMessage(ctx.message.message_id)

})
// const pins = JSON.parse(readFileSync('resources/pin.json', 'utf8'))
import pins from "@resources/pin"
bot.hears('post pins؜', (ctx, next) => {

	ctx.reply('heres your pins',
	Markup.keyboard(
		reshape(Object.keys(pins), 2)
	))
	ctx.deleteMessage(ctx.message.message_id)
})
bot.hears(Object.keys(pins), ctx => ctx.reply('not here yet', panel[1]))

bot.command('/ban', async (ctx, next) => {

	let [__, username ] = ctx.message.text.split(' ')
	if (!/@/.test(username)) username = '@$-' + username + '/'+ toUnicode(username)

	const {status} = await ctx.getChatMember(ctx.from.id)
	if ( status === 'administrator' || status === 'creator' ) {
		const holder = await pagiQuery<[number]>('by_username', username.slice(1))

		ctx.banChatMember(holder[0])
	} else ctx.reply("nothing happened", {reply_to_message_id : ctx.message.message_id})

})

// const words: format = JSON.parse(readFileSync('resources/banned-words.json', 'utf8'))
import words from "@resources/banned-words"
bot.on("text", (ctx, next) => {
	
	const {text, message_id, from} = ctx.message
	const {username} = from
	if (compare(text, words)) {
		ctx.deleteMessage(message_id)
	}
})
const stage = new Scenes.Stage<Scenes.SceneContext>([banroom], { ttl: 10 })
bot.use(session()); // still needed to use scenes 
bot.use(stage.middleware())

// serverless funcition 
const handler : Handler = async event => {
	try {
		if (event.body === null) throw new TypeError()
		await bot.handleUpdate(JSON.parse(event.body));
		return { statusCode: 200, body: 'not important' };
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