import {bot, newAdmin} from './core.js'


bot.start( ctx => {
// todo sends the start panel
// todo admin panel 
// todo newsletter sign up sign out command 
})

bot.hears(blacklist, ctx => {
// todo deletes the message
})

bot.hears(questions, ctx => {
// todo send back answers to common questions 
})
bot.on('poll', ctx => {
// todo collect the states of the poll and send them back as a document to shaheen
})
