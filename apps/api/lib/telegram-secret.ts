import { timingSafeEqual } from "node:crypto";

/**
 * Compares the `X-Telegram-Bot-Api-Secret-Token` header with the configured
 * secret in constant time. Fails closed when either is missing.
 */
export const isValidTelegramSecret = (
  header: string | null,
  secret: string | undefined
) => {
  if (!(secret && header)) {
    return false;
  }
  const expected = Buffer.from(secret);
  const received = Buffer.from(header);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
};
