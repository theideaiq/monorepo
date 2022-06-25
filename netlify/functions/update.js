import { Telegraf, Markup } from 'telegraf'
import {inlineKeyboard, columns, pin} from './shard.js'

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

bot.command('/pin', ctx => ctx.reply(pin))
const questions = {'شنو ايلب': 'ايلب برت اينشتاين', 'whats a test': 'testicle'}

bot.hears([/\bسجاد\b/, /\bطحين\b/], ctx => ctx.deleteMessage(ctx.message.message_id)) //black listed words idk
bot.hears(['شنو ايلب', 'whats a test'], ctx => {
	ctx.reply(ctx.match[0])
})


exports.handler = async event => {
	try {
	  await bot.handleUpdate(JSON.parse(event.body));
	  return { statusCode: 200, body: '' };
	} catch (e) {
	  console.log(e)
	  return { statusCode: 400, body: 'This endpoint is meant for bot and telegram communication' };
	}  
}