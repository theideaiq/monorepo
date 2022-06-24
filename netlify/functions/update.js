import axios from 'axios'
const token = process.env.TOKEN

const handler = async (event) => {
	// console.log("Received an update from Telegram!", event.body);

	await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
		chat_id: JSON.parse(event.body).message.chat.id,
		text: "I got your message!",
		reply_markup: {
			inline_keyboard : []
		}
	});
	return { statusCode: 200 };
}

export {
	handler
}