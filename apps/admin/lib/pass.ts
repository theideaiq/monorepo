import "server-only";

import { type PassPath, passUrl } from "@repo/auth/pass";
import { headers } from "next/headers";
import { env } from "@/env";

const TRAILING_SLASH = /\/+$/;

/**
 * The back office's home in `locale`, as an absolute URL for The IDEA Pass's
 * return_to: NEXT_PUBLIC_ADMIN_URL, else this request's own host (local
 * development; the Pass only accepts it if the host is allowlisted there).
 */
export const adminHome = async (locale: string) => {
  if (env.NEXT_PUBLIC_ADMIN_URL) {
    return `${env.NEXT_PUBLIC_ADMIN_URL.replace(TRAILING_SLASH, "")}/${locale}`;
  }
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost";
  const protocol = list.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}/${locale}`;
};

/** A Pass page that comes back to the back office afterwards. */
export const passLink = async (path: PassPath, locale: string) =>
  passUrl(path, await adminHome(locale), locale);
