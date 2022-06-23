import {Telegraf, Markup} from 'telegraf';
import {json, backAndForth} from './shard.js'
// main functions

const {secrets, admins, article, options, newsletter} = await json()
const bot = new Telegraf(secrets.token)

const newAdmin = (ctx) => {
	
}
const user = (ctx) => {
// todo added to a list and counted how many messages they sent 
}
const mainPanel = () => {
// todo houses all the main functionality
}

const adminPanel = (ctx) => {
// todo added  
}
const FAQ = (ctx) => {
	
}
const backAndForth = (ctx, list) => {
// todo back and forth buttons to be used with lists of items
}
const core = {
	adminPanel,
	mainPanel,
	newAdmin,
	user,
	FAQ
}

export {
	admins,
	core,
	bot
}