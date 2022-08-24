import { Telegraf, Scenes, session } from "telegraf";
import { panel, adminPanel, toUnicode, cache } from "@components/shard";
import { newUser, updateUser } from "@components/fauna";
// types
import { Handler } from "@netlify/functions";
import { mine } from "@components/elpers";
// scenes
import { privateChat, banroom } from "@scenes/private";
import { groupChat } from "@scenes/group";
import { adminChat, quiteChat } from "@scenes/admin";

if (process.env.TOKEN === undefined)
  throw new TypeError("BOT_TOKEN must be provided");
// scenes work as a sort of private room inside of the bot
const bot = new Telegraf<mine>(process.env.TOKEN);
const stage = new Scenes.Stage<mine>([
  banroom,
  privateChat,
  groupChat,
  adminChat,
  quiteChat,
]);

bot.use(session()); // still needed to use scenes
bot.use(stage.middleware());
bot.use(async (ctx, next) => {
  const { from, chat } = ctx;
  if (chat?.type === "supergroup" && from !== undefined) {
    const { status } = await ctx.getChatMember(from.id);
    ctx.status = status;
  }

  const date = ctx.message?.date;
  if (date === undefined) return await next();
  const time = new Date().getTime();
  switch (ctx.updateType) {
    case "message":
      if (time / 1000 - date < 5 * 60) {
        await next();
      }
      break;
    case "callback_query":
      if (
        ctx.callbackQuery?.message &&
        time / 1000 - ctx.callbackQuery.message.date < 5 * 60
      ) {
        await next();
      }
      break;
    case "inline_query":
      return await next();
    default:
      return await next();
  }
});
bot.on("message", async (ctx, next) => {
  if (ctx.chat.type !== "private" && ctx.scene.current?.id !== "group")
    ctx.scene.enter("group");
  // for when the bot goes down/updated and the user already has the bot chat open
  else if (ctx.chat.type === "private" && ctx.scene.current?.id === undefined)
    ctx.scene.enter("private");
  return await next();
});

bot.start(async (ctx, next) => {
  if (ctx.chat.type !== "private") return await next();
  let { username } = ctx.from;
  const { first_name, last_name, id } = ctx.from;
  if (username === undefined) {
    username = first_name + (last_name === undefined ? "" : " " + last_name);
    username = username + "$" + toUnicode(username);
  }
  let user;

  if (cache.has(id)) {
    user = cache.get(id);
	updateUser(id, {signed_to_newsletter: true})
  } else {
    user = (
      await newUser(id, {
        id,
        username,
        signed_to_newsletter: true,
      })
    )?.data;
    cache.set(id, user);
  }

  if (user?.status === "administrator" || user?.status === "creator") {
    ctx.reply(...adminPanel);
    return ctx.scene.enter("admin");
  } else {
    ctx.reply(...panel);
    return ctx.scene.enter("private");
  }
});

// serverless funcition
const handler: Handler = async (event) => {
  try {
    if (event.body === null) throw new TypeError();
    await bot.handleUpdate(JSON.parse(event.body));
    return { statusCode: 200, body: "" };
  } catch (e) {
    console.log(e);
    return {
      statusCode: 500,
      body: "This endpoint is meant for bot and telegram communication",
    };
  }
};
export { handler };


process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
