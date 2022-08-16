import { Scenes, Markup } from "telegraf"
import { banreq, pagiQuery } from "@components/fauna"
import { Secache, cache, splitArray, reshape, panel } from "@components/shard"
import { mine, pinholder } from "@components/elpers"
import pi from "@resources/pin.json"

const FAQsub = ['General؜', 'Education؜', 'Sources؜', 'About the post؜']
const pins = <Record<string, Record<string, string|Record<string, string>>>>pi
export const privateChat = new Scenes.BaseScene<mine>('private') 
export const banroom = new Scenes.BaseScene<mine>('banroom') 

privateChat.start(ctx => ctx.reply("hello again", panel[1]))

privateChat.hears("Unban Request؜", ctx => {
	
	ctx.deleteMessage(ctx.message.message_id)
	return ctx.scene.enter('banroom')

})

banroom.enter(ctx => ctx.reply('send an unban request message'))
banroom.on('text', async ctx => {
	if (ctx.chat.type !== "private") {
		return ctx.scene.enter('group')
	}
	const {text, from} = ctx.message
	const {id, username } = from
	let banned : boolean
	
	if (cache.has(id)) {
		banned = cache.peek(id)?.banned!
		if (banned) banreq(id, text)
	} else {
		banned = await banreq(from.id, text)
		cache.set(id, {
			chat_id : ctx.chat.id,
			last : text,
			username,
			banned,
			id, 
		})
	}
	
	if (banned) {
		ctx.reply('the fox is not here yet, tho your need is known to me')
		// const holder = await pagiQuery<number>('by-status', "administrator") // index does not exist 
		// const theOne = holder[Math.floor(Math.random() * holder.length)]
		
		// ctx.forwardMessage(theOne)

	} else ctx.reply("you are either not banned or lost")
	return ctx.scene.enter('private')
})

privateChat.hears('FAQ؜', ctx => {

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

privateChat.hears(FAQsub, async ctx => {
	const match = ctx.match[0].replace('؜', '')

	if (!Secache.has(match)) {
		Secache.set(match, splitArray( await pagiQuery<string[]>('by_subject', match)))
	} 
	const [que, ans] = Secache.get<string[][]>(match)!

	ctx.reply('here you go',
		Markup.keyboard(
			reshape([...que, "back"], 3)
		).resize(true)
	)

	privateChat.hears(que, ctx => {

		ctx.reply(ans[que.indexOf(ctx.match[0])], panel[1])
		ctx.deleteMessage(ctx.message.message_id)

	})
})

privateChat.hears('Links؜', ctx => {
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

privateChat.hears('Pin؜', ctx => {
	
	ctx.reply('heres your pins',
		Markup.keyboard(
			reshape([...Object.keys(pins), "المصادر؜", "back"], 2)
	))
	ctx.deleteMessage(ctx.message.message_id)
	
})

privateChat.hears("المصادر؜", ctx => {
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

privateChat.hears(Object.keys(pins), async ctx => {
	const match = ctx.match[0]
	const pin = pins[match]
	let holder : pinholder
	if (!Secache.has(match)){
		const temp : pinholder = [[match, []] , ]
		for (const [key, value] of Object.entries(pin)) {
			if ( typeof value === 'string' ) temp[0][1].push([Markup.button.url(key, value)])
			else { 
				const dex = temp.push([key, []]) 
				for (const [inkey, invalue] of Object.entries(value)) {
					temp[dex-1][1].push([Markup.button.url(inkey, invalue)])
				}
			}
		} 
		Secache.set(match, temp)
		holder = temp
	} else holder = Secache.get<pinholder>(match)!

	holder.forEach(
		([text, buttons])=> ctx.reply(text, Markup.inlineKeyboard(buttons))
	)
})

privateChat.hears("back", ctx => ctx.reply('back you go', panel[1]))