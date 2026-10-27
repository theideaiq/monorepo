import { resolveTxt } from "node:dns/promises";

/**
 * Domain verification for Sign in with The IDEA Pass apps: a company
 * proves it controls a domain with a DNS TXT record or a file on the
 * site, each holding the token we gave it.
 */

/** The DNS name of the TXT record. */
export const verificationName = (domain: string) => `_theidea-pass.${domain}`;

/** The TXT record's value. */
export const verificationValue = (token: string) =>
  `theidea-pass-verification=${token}`;

/** Where the file goes, on https. */
export const verificationPath = "/.well-known/theidea-pass-verification.txt";

/** Whether one of the TXT records (each in chunks) holds the token. */
export const txtMatches = (records: string[][], token: string) =>
  records.some((chunks) => chunks.join("").trim() === verificationValue(token));

/** Whether the file holds the token (alone or as the TXT value). */
export const fileMatches = (body: string, token: string) => {
  const text = body.trim();
  return text === token || text === verificationValue(token);
};

const MAX_FILE_BYTES = 1024;

interface Lookups {
  fetchFile: (url: string) => Promise<string | null>;
  txt: (name: string) => Promise<string[][]>;
}

/** The file, without following redirects; at most 1 KB, 5 seconds. */
const fetchFile = async (url: string) => {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!response?.ok) {
    return null;
  }
  const text = await response.text().catch(() => "");
  return text.slice(0, MAX_FILE_BYTES);
};

const lookups: Lookups = {
  fetchFile,
  txt: (name) => resolveTxt(name).catch(() => []),
};

/** How the domain is verified (DNS first, then the file), or null. */
export const checkDomain = async (
  domain: string,
  token: string,
  using: Lookups = lookups
): Promise<"dns" | "file" | null> => {
  if (txtMatches(await using.txt(verificationName(domain)), token)) {
    return "dns";
  }
  const body = await using.fetchFile(`https://${domain}${verificationPath}`);
  return body !== null && fileMatches(body, token) ? "file" : null;
};
