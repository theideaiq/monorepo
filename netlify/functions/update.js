import { Telegraf, Markup } from 'telegraf'
import { getQuery, newUser, pagiQuery  } from './components/fauna.js'
import {indexOf2d, columns, pin, panel, regex} from './components/shard.js'

const bot = new Telegraf(process.env.TOKEN)

bot.start(async ctx => {

	const {first_name, last_name, username, id} = ctx.from
	newUser(first_name+last_name, username, true)

	ctx.reply(...panel)
})
const FAQsub = ['General', 'Education', 'Sources', 'About the post']

bot.action('main FAQ', ctx => {
	ctx.editMessageText(
		'Ask your question',
		columns(
			FAQsub.map(sub => 
				Markup.button.callback(sub, 'FAQsub')
				)
		),
		{disable_notification : true}
		)
})
bot.action('unbanReq', ctx => {
	ctx.editMessageText(...panel, {disable_notification : true})
	ctx.reply( (false)? 'you have been put in the queue': 'you are not banned', {disable_notification : true})
})

bot.action('FAQsub', async ctx => {
	const sub = ctx.match[0]
	const FAQs = await pagiQuery('by_subject', sub)
	ctx.reply('pick your question',
		columns(
			FAQs.map(faq => 
				Markup.button.callback(faq[0], 'FAQ message')
				)
		),
		{disable_notification : true}
	)
	bot.action('FAQ message', ctx => {
		const FAQ = ctx.match[0]
		ctx.editMessageText(...panel, {disable_notification : true})
		ctx.reply(indexOf2d(FAQs, FAQ).array[1])
	})
})
let blacklist = await getQuery('by_option', 'banned_words')
blacklist = blacklist.data.words.map(regex)
bot.hears(blacklist, ctx => ctx.deleteMessage(ctx.message.message_id)) //black listed words idk

let holder = await getQuery('by_option', 'replies')
holder = holder.data.words
const [texts, replies] = [[], []]
for (const lst of holder) {
	texts.push(lst[0])
	replies.push(lst[1])
}
bot.hears(texts, ctx => ctx.reply(replies[texts.indexOf(ctx.match[0])]))

bot.command('/pin', ctx => ctx.reply(pin, {parse_mode: 'HTML'}))

// exports.handler = async event => {
// 	try {
// 	  await bot.handleUpdate(JSON.parse(event.body));
// 	  return { statusCode: 200, body: '' };
// 	} catch (e) {
// 	  console.log(e)
// 	  return { statusCode: 400, body: 'This endpoint is meant for bot and telegram communication' };
// 	}  
// }