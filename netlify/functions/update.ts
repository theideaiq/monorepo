import { cache, panel, reshape, splitArray, toUnicode } from '@components/shard'
import { newUser, pagiQuery, user  } from '@components/fauna'
import {compare, format} from "@components/nlp"
import { Telegraf, Markup, Scenes, session, } from 'telegraf'
import { Handler } from "@netlify/functions";
// use the cache to declare 

if (process.env.TOKEN === undefined) throw new TypeError('BOT_TOKEN must be provided')
interface mine extends Scenes.SceneContext {
	status? : string
}

const bot = new Telegraf<mine>(process.env.TOKEN)
const banroom = new Scenes.BaseScene<mine>('banroom')

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
		banned: false,
		status : 'member',
		ban_request : '',
		signed_to_newsletter: true,
	})

	ctx.reply(...panel)

}) 
// does not work for some reason 
bot.hears("Unban request؜", async ctx => {

	ctx.deleteMessage(ctx.message.message_id)
	ctx.scene.enter('banroom')

})

banroom.enter(ctx => ctx.reply('send an unban request message'))
banroom.on('text', async ctx => {
	ctx.reply('the fox is not here yet, tho your need is known to me')
	const holder = await pagiQuery<number[]>('by-status', "administrator") // index does not exist 
	const theOne = holder[Math.floor(Math.random() * holder.length)]
	bot.telegram.sendMessage(theOne, ctx.message.text)
	ctx.scene.leave()
})

const FAQsub = ['General؜', 'Education؜', 'Sources؜', 'About the post؜', 'back؜']

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
FAQsub.forEach(el => {
	pagiQuery<string[][]>('by_subject', el.replace('؜', ''))
	.then(holder => {
		const [que, ans] = splitArray(holder)	

		bot.hears(FAQsub, async ctx => {
			ctx.reply('here you go',
				Markup.keyboard(		
					reshape(que, 3)
				).resize(true)
			)
		})

		bot.hears(que, ctx => {
			ctx.reply(ans[que.indexOf(ctx.match[0])], panel[1])
			ctx.deleteMessage(ctx.message.message_id)
		})			
	})
})
bot.hears('The post family links؜', ctx => {
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
import pins from "@resources/pin.json"
bot.hears('post pins؜', ctx => {

	ctx.reply('heres your pins',
	Markup.keyboard(
		reshape(Object.keys(pins), 2)
	))
	ctx.deleteMessage(ctx.message.message_id)
})
bot.hears(Object.keys(pins), ctx => ctx.reply('not here yet', panel[1]))

bot.command('/ban', async ctx => {

	const {status, message} = ctx
	let [__, username ] = message.text.split(' ')
	if (!/@/.test(username)) username = '@$-' + username + '/'+ toUnicode(username)
	
	const user = cache.find(el => {
		el.username === username
	})

	if ( status === 'administrator' || status === 'creator' ) {
		const holder = (user !== undefined)? user.id :(await pagiQuery<[number]>('by_username', username.slice(1)))[0]
		
		ctx.banChatMember(holder)
	} else ctx.reply("nothing happened", {reply_to_message_id : message.message_id})

})


// const words: format = JSON.parse(readFileSync('resources/banned-words.json', 'utf8'))
import words from "@resources/banned-words.json"
bot.on("text", async ctx => {
	const {message, status} = ctx
	const {text, message_id, from, chat} = message
	let {username, id, first_name, last_name} = from
	const {id : chat_id} = chat

	if (username === undefined) {
		username = '$-' + first_name + (last_name === undefined)? '': last_name
		username += '/' + toUnicode(username!)
	} 
	if (!cache.has(id)) {
		cache.set(id, {
			id,
			status,
			chat_id,
			username,
			last: text,
			samecount: 0,
			messages : [], 
			banned: false,
			ban_request : '',
			signed_to_newsletter: false,
		})
	}
	if (compare(text, words)) {
		try {ctx.deleteMessage(message_id)}
		catch (e) {console.log(e)}
	} 
	const user = cache.get<user>(id)
	if (user!.samecount! > 3){
		user!.messages!.forEach(el => {
			ctx.deleteMessage(el)
			user!.messages!.pop()
		}) 
		if (ctx.chat.type === "supergroup")
			ctx.restrictChatMember(id, {
				until_date : Math.floor((Date.now() /1000.0) + 350), 
				permissions : {can_send_messages: false, can_send_other_messages: false}
			})
	}
	if (user!.last === text && user!.chat_id === chat_id) {
		user!.samecount !+= 1 
		user!.messages!.push(message_id)
	} else {
		user!.last = text
		user!.chat_id = chat_id
		while (user!.messages!.length) user!.messages!.pop()
		user!.messages![0]= message_id
		user!.samecount != 0 
	}
})

const stage = new Scenes.Stage<mine>([banroom], { ttl: 10 })
bot.use(session()); // still needed to use scenes 
bot.use(stage.middleware())

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