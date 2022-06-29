import { Telegraf, Markup } from 'telegraf'
import { getQuery, newUser, pagiQuery, updateQuery  } from './components/fauna.js'
import { pin, panel, regex, splitArray, toUnicode } from './components/shard.js'

const bot = new Telegraf(process.env.TOKEN)

bot.start(async ctx => {

	const {first_name, last_name, username, id} = ctx.from
	if (typeof username === "undefined") {
		username = '$-' + first_name + (typeof last_name === 'undefined')? '': last_name 
		username += '/' + toUnicode(username)
	} 
	newUser(first_name+' '+last_name, username, id, true)
	ctx.reply(...panel)

})

const FAQsub = ['General؜', 'Education؜', 'Sources؜', 'About the post؜']
new Promise((res, rej) => {
	bot.hears("Unban request؜", ctx => {
		ctx.editMessageText('send a request message')
		res("message")
	})
}).then(listen => {
	bot.on(listen, ctx => {
		if (banreq(ctx.from.id)) {
			ctx.reply('you have been put in the queue', {disable_notification : true})
		}
		ctx.reply('you are not banned', {disable_notification : true})
		
	})
})
bot.hears('FAQ page؜', ctx => {
	ctx.editMessageText( 'pick your question',
		Markup.keyboard(
			[
				FAQsub.slice(0,2),
				FAQsub.slice(2)
			]
		).resize(true)
	)
})

new Promise((res, rej) => {
	bot.hears(FAQsub, async ctx => {
		const [que, ans] = splitArray(await pagiQuery('by_subject', ctx.match[0].replace('؜', '')))
		
		const lst = []
		while(que.length) lst.push(que.splice(0,3));
		lst.forEach(el => que.push(...el))
		ctx.editMessageText('FAQs for you',
			Markup.keyboard(		// currrow.length referce to the row we are in
				lst
			).resize(true)
		)
		res([que, ans])
	})
}).then(([que, ans]) => {
	bot.hears(que, ctx => {
		ctx.editMessageReplyMarkup(panel[1])
		ctx.reply(ans[que.indexOf(ctx.match[0])])
		ctx.deleteMessage(ctx.message.message_id)
	})
})

bot.hears('The post family links؜', ctx => {
	ctx.deleteMessage(ctx.message.message_id)
	ctx.reply('here you go', 
		{ reply_markup: {
			inline_keyboard: [
				Markup.button.url('the post website', 'https://t.me/thepostiq'),
				Markup.button.url('the post group', 'https://t.me/thepostofficeiq'),
				Markup.button.url('art club group','https://t.me/artclub_iq'),
				Markup.button.url('the post instagram','https://instagram.com/thepostiq'),
				Markup.button.url("art club instagram",'https://instagram.com/artclubiq'),
				Markup.button.url('the post linkedin','https://linkedin.com/company/thepostproject'),
				Markup.button.url('the post facebook','https://web.facebook.com/thepostiq'),
				Markup.button.url('the post twitter','https://twitter.com/thepostiq')
			]
		}}
	)
})
// handling deleting banned words
getQuery('by_option', 'banned_words')
.then(holder => {

	bot.hears(
		holder.data.words.map(regex)
		, ctx => ctx.deleteMessage(ctx.message.message_id)
		) //blacklisted words idk
	
}).catch(console.error)
// handling the question replies 
getQuery('by_option', 'replies')
.then(holder => {

	holder = holder.data.words
	const [texts, replies] = [[], []]
	for (const lst of holder) {
		texts.push(lst[0])
		replies.push(lst[1])
	}
	bot.hears(texts, ctx => ctx.reply(replies[texts.indexOf(ctx.match[0])]))
	
}).catch(console.error)


bot.command('/pin', ctx => ctx.reply(pin, {parse_mode: 'HTML'}))
bot.command('/ban', async ctx => {

	const [__, username ] = ctx.message.text.split(' ')
	if (!/@/.test(username)) 
		username = '@$-' + username + '/'+ toUnicode(username)

	const status =(await ctx.getChatMember(ctx.from.id)).status 
	if ( status === 'administrator' || status === 'creator' ) {
		const holder = await pagiQuery('by_username', username.slice(1))
		ctx.banChatMember(holder[0])
	} else ctx.reply("you ain't a playa", {reply_to_message_id : ctx.message.message_id})

})

// exports.handler = async event => {
// 	try {
// 	  await bot.handleUpdate(JSON.parse(event.body));
// 	  return { statusCode: 200, body: '' };
// 	} catch (e) {
// 	  console.log(e)
// 	  return { statusCode: 400, body: 'This endpoint is meant for bot and telegram communication' };
// 	}  
// }