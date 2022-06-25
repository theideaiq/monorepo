import { Telegraf, Markup } from 'telegraf'
import {inlineKeyboard, columns} from './shard.js'

const bot = new Telegraf(process.env.TOKEN)

bot.start(ctx => {
	ctx.reply(
		'What do you need from me',
		inlineKeyboard([
			[
				Markup.button.callback('unban request', 'unbenned'),
				Markup.button.callback('FAQ page', 'main FAQ'),
			],
			[Markup.button.callback('the post family links', 'postLinks')],
			[Markup.button.url('the post website', 'https://post-iq.com/')] 
		])
	)
})

bot.command('/pin', ctx => bot.telegram.forwardMessage(ctx.from.id , -1001502247742, 231))

bot.hears([/\bسجاد\b/, /\bفرخ\b/], ctx => ctx.deleteMessage(ctx.message.message_id))


exports.handler = async event => {
	try {
	  await bot.handleUpdate(JSON.parse(event.body));
	  return { statusCode: 200, body: '' };
	} catch (e) {
	  console.log(e)
	  return { statusCode: 400, body: 'This endpoint is meant for bot and telegram communication' };
	}  
}