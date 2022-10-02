import { Scenes, Markup } from "telegraf";
import { banreq, pagiQuery } from "@components/fauna";
import { secache, cache, splitArray, reshape, panel, adminPanel } from "@components/shard";
import { mine, pinholder } from "@components/elpers";
import pi from "@resources/pin.json";

const FAQsub = ["General؜", "Education؜", "Sources؜", "About the post؜"];
const pins = <Record<string, Record<string, string | Record<string, string>>>>pi;
export const privateChat = new Scenes.BaseScene<mine>("private");
export const banroom = new Scenes.BaseScene<mine>("banroom");

privateChat.start((ctx) => ctx.reply("hello again", panel[1]));

privateChat.hears("Unban Request؜", (ctx) => {
	ctx.deleteMessage(ctx.message.message_id);
	return ctx.scene.enter("banroom");
});

banroom.enter((ctx) => ctx.reply("send an unban request message"));
banroom.on("text", async (ctx) => {
	const { text, from } = ctx.message;
	const { id, username, first_name } = from;
	let banned: boolean | undefined;

	const data = { text, id, username, first_name };
	if (cache.has(id)) {
		banned = cache.peek(id)?.banned;
		if (banned) banreq(id, data);
	} else {
		banned = await banreq(from.id, data);
		cache.set(id, {
			username,
			banned,
			id,
		});
	}

	if (banned) {
		ctx.reply("the fox is not here yet, tho your need is known to me");
	} else ctx.reply("you are either not banned or lost");
	return ctx.scene.enter("private");
});

privateChat.hears("FAQ؜", (ctx) => {
	ctx.deleteMessage(ctx.message.message_id);
	ctx.reply(
		"pick your question",
		Markup.keyboard([["General؜", "Education؜"], ["Sources؜", "About the post؜"], ["back"]]).resize(
			true,
		),
	);
});

privateChat.hears(FAQsub, async (ctx) => {
	const match = ctx.match[0].replace("؜", "");

	if (!secache.has(match)) {
		secache.set(match, splitArray(await pagiQuery<string[]>("by_subject", match)));
	}
	const [que, ans] = <string[][]>secache.get(match);

	ctx.reply("here you go", Markup.keyboard(reshape([...que, "back"], 3)).resize(true));

	privateChat.hears(que, (ctx) => {
		ctx.reply(ans[que.indexOf(ctx.match[0])], panel[1]);
		ctx.deleteMessage(ctx.message.message_id);
	});
});

privateChat.hears("Links؜", (ctx) => {
	ctx.reply("here you go", {
		reply_markup: {
			inline_keyboard: [
				["Website", "https://t.me/thepostiq"],
				["The Post Office", "https://t.me/thepostofficeiq"],
				["Art Club", "https://t.me/artclubiq"],
				["Instagram", "https://instagram.com/thepostiq"],
				["Art Club Instagram", "https://instagram.com/artclubiq"],
				["Linkedin", "https://linkedin.com/company/thepostproject"],
				["Facebook", "https://web.facebook.com/thepostiq"],
				["Twitter", "https://twitter.com/thepostiq"],
			].map(([el, ln]) => [Markup.button.url(el, ln)]),
		},
	});
	ctx.deleteMessage(ctx.message.message_id);
});

privateChat.hears("Pin؜", (ctx) => {
	ctx.reply(
		"heres your pins",
		Markup.keyboard(reshape([...Object.keys(pins), "المصادر؜", "back"], 2)),
	);
	ctx.deleteMessage(ctx.message.message_id);
});

privateChat.hears("المصادر؜", (ctx) => {
	ctx.reply(`لستة رح نظل نحدثها باكثر واهم المصادر الي نستخدمها احنا بالبوست:
	- @munahiraqi (https://t.me/joinchat/U8sSDHfww7sm5JBK)
	- @applyformeAFM (https://t.me/+cDbDEM9q069jZjky)
	- @thekhana
	- @thestation_baghdad
	- @iylep2021Q
	- @uwc_iraq (@uwc2021)
	- @thegrinders10 (@TGY10)
	- @codergirl21
	- @teamx70 (@TeamXGroup)`, {disable_web_page_preview:true});
});

privateChat.hears(Object.keys(pins), async (ctx) => {
	const match = ctx.match[0];
	const pin = pins[match];
	let holder: pinholder;
	if (!secache.has(match)) {
		const temp: pinholder = [[match, []]];
		for (const [key, value] of Object.entries(pin)) {
			if (typeof value === "string") temp[0][1].push([Markup.button.url(key, value)]);
			else {
				const dex = temp.push([key, []]);
				for (const [inkey, invalue] of Object.entries(value)) {
					temp[dex - 1][1].push([Markup.button.url(inkey, invalue)]);
				}
			}
		}
		secache.set(match, temp);
		holder = temp;
	} else holder = <pinholder>secache.get(match);

	holder.forEach(([text, buttons]) => ctx.reply(text, Markup.inlineKeyboard(buttons)));
});
privateChat.hears("Back to the admin panel؜", async (ctx, next) => {
	const { username, id } = ctx.from;

	let status;
	if (cache.has(id)) {
		status = cache.get(id)?.status;
	} else {
		status = (
			await pagiQuery<"administrator" | "creator" | "member" | "restricted" | "left" | "kicked">(
				"by_id2",
				id,
			)
		)[0];
		cache.set(id, { status, id, username, banned: false });
	}

	if (status === "administrator" || status === "creator") {
		ctx.reply(...adminPanel);
		return ctx.scene.enter("admin");
	}
	return await next();
});

privateChat.hears("back", (ctx) => ctx.reply("back you go", panel[1]));
