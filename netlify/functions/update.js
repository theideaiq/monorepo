import axios from 'axios'
import {telegram} from './shard.js'

// const token = process.env.TOKEN
const inlinecallback = (text, callback_data) => {text ,callback_data}
const inlinelink = (text, url) => {text, url}



const handler = async (event) => {
	// console.log("Received an update from Telegram!", event.body);
	// "type" "private"
	const bot = new telegram(event.body)
	bot.commands('/start', ctx => {

		ctx.reply('the new test',[
			[inlinecallback('text','wip'),
			inlinecallback('test','wip')],
			[inlinecallback('a work in progress', 'wip')],
			[inlinelink('the post office', 'https://post-iq.com/')]
		])

	})
		
	return { statusCode: 200 };
}
export  {handler}