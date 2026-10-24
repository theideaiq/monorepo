import "server-only";

import { env } from "@/env";
import { createFcmSender, type PushSender, parseServiceAccount } from "./fcm";

let sender: PushSender | null | undefined;

/** The FCM sender, or null while FCM_SERVICE_ACCOUNT is unset or invalid. */
export const getPushSender = (): PushSender | null => {
  if (sender === undefined) {
    const account = parseServiceAccount(env.FCM_SERVICE_ACCOUNT);
    sender = account ? createFcmSender(account) : null;
  }
  return sender;
};
