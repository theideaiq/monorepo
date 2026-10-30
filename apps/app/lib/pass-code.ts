/**
 * The IDEA Pass card code: 6 digits that change every 30 seconds (TOTP,
 * RFC 6238, HMAC-SHA1), worked out on the device from the member's secret,
 * so it works offline. `check_pass()` in the database checks the same code
 * at the counter, and Google Wallet rotates it the same way.
 */

export const PASS_CODE_PERIOD_SECONDS = 30;

const HEX_PAIR = /.{2}/g;

const fromHex = (hex: string) =>
  new Uint8Array(
    (hex.match(HEX_PAIR) ?? []).map((pair) => Number.parseInt(pair, 16))
  );

/** The 30-second step at `time` (milliseconds since 1970). */
export const passCodeStep = (time: number) =>
  Math.floor(time / 1000 / PASS_CODE_PERIOD_SECONDS);

/** Seconds left before the code at `time` changes. */
export const secondsLeft = (time: number) =>
  PASS_CODE_PERIOD_SECONDS -
  (Math.floor(time / 1000) % PASS_CODE_PERIOD_SECONDS);

/**
 * The member's secret as a non-extractable HMAC key: the device can work
 * out codes with it but no script can read the secret back, so it can be
 * kept on the device (IndexedDB) without storing the secret in clear text.
 */
export const importPassKey = (secretHex: string) =>
  crypto.subtle.importKey(
    "raw",
    fromHex(secretHex),
    { hash: "SHA-1", name: "HMAC" },
    false,
    ["sign"]
  );

/** The 6-digit code for the card key at a 30-second step. */
export const passCodeWithKey = async (key: CryptoKey, step: number) => {
  const counter = new DataView(new ArrayBuffer(8));
  counter.setUint32(0, Math.floor(step / 2 ** 32));
  counter.setUint32(4, step % 2 ** 32);
  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, counter.buffer)
  );
  // RFC 4226 dynamic truncation, in arithmetic rather than bit operations.
  const byte = (index: number) => digest[index] ?? 0;
  const offset = byte(19) % 16;
  const binary =
    (byte(offset) % 128) * 2 ** 24 +
    byte(offset + 1) * 2 ** 16 +
    byte(offset + 2) * 2 ** 8 +
    byte(offset + 3);
  return String(binary % 1_000_000).padStart(6, "0");
};

/** The 6-digit code for a hex secret at a 30-second step. */
export const passCode = async (secretHex: string, step: number) =>
  passCodeWithKey(await importPassKey(secretHex), step);

/** What the card's QR code carries, read by `check_pass()` at the counter. */
export const passPayload = (memberNumber: number, code: string) =>
  `IDEA:${memberNumber}:${code}`;

/** "100 123" style grouping for the member number on the card. */
export const formatMemberNumber = (memberNumber: number) =>
  String(memberNumber).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
