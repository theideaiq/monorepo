/**
 * Anti-flood: someone who sends the same message more than `limit` times in
 * a row in a group gets those messages deleted and a short mute. Any other
 * message in between starts the count again.
 */
import type { KeyValueStore } from "./store";

export const FLOOD_LIMIT = 3;
/** How long a run of identical messages is remembered. */
export const FLOOD_WINDOW_SECONDS = 120;
export const FLOOD_MUTE_SECONDS = 300;

interface FloodState {
  hash: string;
  messageIds: number[];
}

/** FNV-1a: keeps the stored state small whatever the message length. */
const fingerprint = (text: string) => {
  let hash = 0x81_1c_9d_c5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01_00_01_93);
  }
  return `${(hash >>> 0).toString(36)}:${text.length}`;
};

/**
 * Records a message. Returns the ids of the identical run when it crossed the
 * limit (the caller deletes them and mutes the sender), otherwise null.
 */
export const trackFlood = async (
  store: KeyValueStore,
  {
    chatId,
    content,
    limit = FLOOD_LIMIT,
    messageId,
    userId,
  }: {
    chatId: number;
    content: string;
    limit?: number;
    messageId: number;
    userId: number;
  }
): Promise<number[] | null> => {
  const key = `flood:${chatId}:${userId}`;
  const hash = fingerprint(content.trim());
  const previous = await store.get<FloodState>(key);

  const messageIds =
    previous?.hash === hash
      ? [...previous.messageIds, messageId]
      : [messageId];

  if (messageIds.length > limit) {
    await store.delete(key);
    return messageIds;
  }

  await store.set<FloodState>(key, { hash, messageIds }, FLOOD_WINDOW_SECONDS);
  return null;
};
