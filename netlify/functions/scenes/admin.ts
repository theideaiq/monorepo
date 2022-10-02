import { Scenes, Markup } from "telegraf";
import { pagiQuery } from "@components/fauna";
import { mine } from "@components/elpers";
import { secache } from "@components/shard";

export const adminChat = new Scenes.BaseScene<mine>("admin");
export const quiteChat = new Scenes.BaseScene<mine>("quite");

adminChat.start((ctx) => ctx.reply("start what comrade, you're already doing the work"));

adminChat.hears("Send a newsletter؜", (ctx) => {
	ctx.deleteMessage(ctx.message.message_id);
	ctx.scene.enter("quite");
});
quiteChat.enter(async (ctx) => {
	if (!secache.has("newsies")) {
		secache.set("newsies", await pagiQuery<number>("if_signed", true));
	}
	ctx.reply("send the news you need me to forward");
});
quiteChat.on("text", (ctx) => {
	const people = <number[]>secache.get("newsies");
  people.forEach(person => ctx.forwardMessage(person))
});

adminChat.hears("Unban Requests؜", async (ctx) => {
	let requists: { [key: string]: [string, string | undefined] } = {};
	if (secache.has("Unbans")) {
		requists = <typeof requists>secache.get("Unbans");
	} else {
		const requistsObj: [string, number, string | undefined, string][] = await pagiQuery<
			[string, number, string, string]
		>("by_type", "ban request");
		for (const requist of requistsObj) {
			const [text, id, username, first_name] = requist;
			requists[first_name + "-" + id] = [text, username];
		}
		secache.set("Unbans", requistsObj);
	}
	for (const key in requists) {
		const [name] = key.split("-");
		const [text, username] = requists[key];
		if (username !== undefined)
			ctx.reply(
				text,
				Markup.inlineKeyboard([Markup.button.url(username, "https://t.me/" + username)]),
			);
		else ctx.reply(text, Markup.inlineKeyboard([Markup.button.url(name, "")]));
	}
});
// adminChat.hears("FAQ Requests؜", (ctx) => {
//   // maybe
// });
adminChat.hears("View the user panel؜", (ctx) => {
	ctx.reply(
		"Here you go comrade",
		Markup.keyboard([["Unban Request؜", "FAQ؜"], ["Back to the admin panel؜"], ["Links؜", "Pin؜"]]),
	);
	ctx.scene.enter("private");
});
