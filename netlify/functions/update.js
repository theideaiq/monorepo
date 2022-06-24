import axios from 'axios'
import {Markup, Telegram} from 'telegraf'

const token = process.env.TOKEN
const bot = new Telegraf(token)



const reply = (ctx) => {
	await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
		chat_id: JSON.parse(event.body).message.chat.id,
		text: "I got your message!",
		reply_markup: {
			inline_keyboard : [
				Markup.button.callback()
			]
		}
	});
	return { statusCode: 200 };
}
const groups = (ctx) => {

}

bot.commands('pin', ctx => {

})

const handler = async (event) => {
	// console.log("Received an update from Telegram!", event.body);
	// "type" "private"
	const ctx = JSON.parse(event.body)
	bot.sendMessage(ctx.from.id, 'text sent back')
	reply(ctx)

	// switch (ctx.entities.type) {
	// 	case 'bot_command':
	// 		commands(ctx)
	// 		break;
	// 	case 'message' && ctx.chat.type === 'private':
	// 		privates(ctx)
	// 		break;
	// 	case 'message' && ctx.chat.type === 'group':
	// 		groups(ctx)
	// 		break;
	// 	case 'callback_query':
	// 		callback(ctx)
	// 		break;
	// 	case 'poll':
	// 		polls(ctx)
	// 		break;
	// }
	
	return { statusCode: 200 };
}
export default handler
