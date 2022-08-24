import { mine, rights, cacheUser } from "@components/elpers";
import { pagiQuery, userWCache, updateUser } from "@components/fauna";
import { cache, toUnicode } from "@components/shard";
import { Scenes } from "telegraf";
import compare from "@components/nlp";
//
import words from "@resources/banned-words.json";

export const groupChat = new Scenes.BaseScene<mine>("group");

groupChat.command("/ban", async (ctx, next) => {
  const { status, message } = ctx;
  let [, username] = message.text.split(" ");

  if (!/@/.test(username)) username = username + "$" + toUnicode(username);

  const user = cache.find((el) => el?.username === username);

  if (status === "administrator" || status === "creator") {
    const holder =
      user !== undefined
        ? user.id
        : (await pagiQuery<number>("by_username", username.slice(1)))[0];

    return await ctx.banChatMember(holder);
  }
  ctx.reply("nothing happened", { reply_to_message_id: message.message_id });
  return await next();
});

// todo make faster - nlp -
groupChat.on("text", async (ctx, next) => {
  const { message, status, botInfo } = ctx;
  const { text, message_id, from, chat } = message;

  const { id, first_name, last_name } = from;
  let { username } = from;
  const { id: chat_id } = chat;
  const { ...rights } = <rights>await ctx.getChatMember(botInfo.id);

  if (username === undefined) {
    username = first_name + (last_name === undefined ? "" : " " + last_name);
    username = username + "$" + toUnicode(username);
  }

  if (!cache.has(id)) {
    const user = (
      await userWCache(id, {
        id,
        status,
        username,
        banned: false,
      })
    ).data;
    cache.set(id, {
      ...user,

      chat_id,
      last: text,
      count: 0,
      messages: [],
    });
  }

  if (compare(text, words) && rights.can_delete_messages) {
    try {
      return ctx.deleteMessage(message_id);
    } catch (e) {
      console.log(e);
    }
  }

  const user = <cacheUser>cache.get(id);
  if (user.last === text && user.chat_id === chat_id) {
    cache.update(id, {
      count: user.messages?.push(message_id),
      messages: user.messages,
    });
  }
  if (user.count > 3 && user.last === text) {
    for (const msg of user.messages) await ctx.deleteMessage(msg);
    cache.update(id, {
      messages: [],
      count: 0,
    });
    ctx.reply(username + ", you have been put in a timeout, go chill a little");
    ctx.restrictChatMember(id, {
      until_date: Math.floor(Date.now() / 1000.0 + 350),
      permissions: { can_send_messages: false, can_send_other_messages: false },
    });
  } else {
    cache.update(id, {
      last: text,
      chat_id,
      messages: [message_id],
      count: 0,
    });
  }
  return await next();
});

groupChat.on("edited_message", async (ctx, next) => {
  const { text, message_id, photo } = <
    typeof ctx.update.edited_message & { photo?: unknown[] }
  >ctx.editedMessage;
  if (text === undefined && photo !== undefined) return await next();
  const { ...rights } = <rights>await ctx.getChatMember(ctx.botInfo.id);

  if (compare(text, words) && rights.can_delete_messages) {
    try {
      return ctx.deleteMessage(message_id);
    } catch (e) {
      console.log(e);
    }
  }
});

groupChat.on("chat_member", async (ctx, next) => {
  const { status: oldStatus } = ctx.chatMember.old_chat_member;
  const { status, user } = ctx.chatMember.new_chat_member;
  switch (status) {
    case oldStatus:
      return await next();
    case "kicked": // update the data base {banned : true, status "kicked"}
      updateUser(user.id, {
        banned: true,
        status,
      });
      break;
    case "member": // update the data base {status : "member"}
      updateUser(user.id, {
        banned: false,
        status,
      });
      break;
    default:
      updateUser(user.id, { status });
      break;
  }
});
