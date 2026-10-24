import { timingSafeEqual } from "node:crypto";

/**
 * Whether the request carries `Authorization: Bearer <secret>`, compared in
 * constant time. Fails closed when the secret is not configured.
 */
export const hasBearerSecret = (
  request: Request,
  secret: string | undefined
) => {
  if (!secret) {
    return false;
  }
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
};
