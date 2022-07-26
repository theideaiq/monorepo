
# the post droid

links & commands needed to set the boot

<https://api.telegram.org/bot[yoursite]/getUpdates?allowed_updates>=["update_id", "message", "edited_message", "inline_query", "chosen_inline_result", "callback_query", "poll", "poll_answer", "my_chat_member", "chat_member"]

<https://api.telegram.org/bot[yoursite]/setWebhook>

curl -F "url=<https://[yoursite].netlify.app/.netlify/functions/update>" <https://api.telegram.org/bot[botkey]/setWebhook>

5414829616:AAFT83gt186m2zzdDEBtX_avaMDJ7VVTlg4

https://driost.netlify.app/.netlify/functions/update

https://api.telegram.org/bot5414829616:AAFT83gt186m2zzdDEBtX_avaMDJ7VVTlg4/deleteWebhook

https://api.telegram.org/bot5414829616:AAFT83gt186m2zzdDEBtX_avaMDJ7VVTlg4/setWebhook?url=https://driost.netlify.app/.netlify/functions/update