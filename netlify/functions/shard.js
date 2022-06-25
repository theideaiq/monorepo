const getUser = info => {
	const { id, is_bot: isBot, first_name: firstName, last_name: lastName } = info
	const name = (firstName ? firstName : '' + ' ' + lastName ? lastName : '').trim()
	return { id, isBot, name }
}
const inlineKeyboard = (buttons) => {
	reply_markup: {
	   inline_keyboard: buttons
   }
}
const columns = (buttons) => {
   return { reply_markup: {
	   inline_keyboard: buttons.map(el =>[el])
   }}
}

export { inlineKeyboard, columns, getUser}