
# the post droid

links & commands needed to set the boot

command to update the telegram api updates:
check the [api](https://core.telegram.org/bots/api#getting-updates) documantation for the full list of availabile updates

<https://api.telegram.org/bot[yoursite]/getUpdates?allowed_updates=[updates]>

ones we're using= ["update_id", "message", "edited_message", "inline_query", "chosen_inline_result", "callback_query", "poll", "poll_answer", "my_chat_member", "chat_member"]

small article to set the webhook
<https://xabaras.medium.com/setting-your-telegram-bot-webhook-the-easy-way-c7577b2d6f72>

TL;DR put this url in da browser with the bot token and teh webhook url
<https://api.telegram.org/bot[bottkoen]/setWebhook?url=https://[siteurl]>

	for server webhooks
``` javascript
	bot.launch({
		webhook: {
			domain: 'url direction',
			port: 'port number' look at the telegram bot api for the available ports 
		}
	})
```