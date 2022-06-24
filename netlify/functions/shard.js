
class context {
	constructor (ctx) {
		this.ctx = ctx
		this.url = (api) => `https://api.telegram.org/bot${process.env.TOKEN}/${api}`
	}
	
	async forward (chat_id, disable_notification) {
		await axios.post(this.url('forwardMessage'), {
			chat_id,
			from_chat_id : this.ctx.chat.id,
			message_id : this.ctx.message_id,
			disable_notification
		})
		
	}
	async delete (chat_id, message_id) {
		await axios.post(this.url('deleteMessage'), {
			chat_id,
			message_id
		})
	}
	async reply (text, inline_keyboard) {
		await axios.post(this.url('sendMessage'), {
			chat_id: this.ctx.message.chat.id,
			text,
			reply_markup: {inline_keyboard}
			})
		
		return { statusCode: 200 };
	}
}


class telegram {
	constructor (ctx) {
		this.ctx = JSON.parse(ctx).message
		this.text = this.ctx.text
		this.url = (api) => `https://api.telegram.org/bot${process.env.TOKEN}/${api}`
	}
	async sendMessage (text, chat_id, inline_keyboard) {
		await axios.post(this.url('sendMessage'), {
			chat_id,
			text,
			reply_markup: {inline_keyboard}
			})	
	}
	async hears (words, callback) {
		if (this.ctx.entities[0].type != 'message') return this;
		if (Array.isArray(words)) {
			for (const str of words) {
				if (str instanceof RegExp && str.test(this.test)) {
					await callback(new context(this.ctx))
					break;
				}
				else if (str == this.text) {
					await callback(new context(this.ctx))
					break;
				}
			}
			
		}
		else if (words instanceof RegExp && str.test(this.test)) await callback(new context(this.ctx))
		else if (words == this.text ) await callback(new context(this.ctx))

		return this;
	}
	async on (event, callback){
		if (this.ctx.entities[0].type == event) await callback(new context(this.ctx))
	}
	async commands (command) {
		if (this.ctx.entities[0].type == "bot_command" && this.text == command)
			await callback(new context(this.ctx))
		return this;
	}
	async delete (chat_id, message_id) {
		await axios.post(this.url('deleteMessage'), {
			chat_id,
			message_id
		})
	}
	async forward (chat_id, from_chat_id, message_id, disable_notification) {
		await axios.post(this.url('forwardMessage'), {
			chat_id,
			from_chat_id,
			message_id,
			disable_notification
		})
	}
}

export default telegram