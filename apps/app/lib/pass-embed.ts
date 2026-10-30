/**
 * The live Pass card on a partner's own site (/pass/embed): the paths, the
 * origins that may frame it and the messages between the frame, the popup
 * that connects it and the partner's page.
 */

const EMBED_PATH = /^\/pass\/embed(\/|$)/;
const EMBED_REQUEST_PATH = /^(\/ar)?\/pass\/embed(\/|$)/;
const EMBED_CONNECT_PATH = /^(\/ar)?\/pass\/embed\/connect\/?$/;
const SIGN_IN_PATH = /^(\/ar)?\/(sign-in|mfa|onboarding)(\/|$)/;
const CONNECT_RETURN = /^(\/ar)?\/pass\/embed\/connect([/?]|$)/;
const WILDCARD_ORIGIN = /^https:\/\/\*\.(.+)$/;
const TOKEN = /^[0-9a-f]{64}$/;

/** The embed and its popup, without the locale prefix (`usePathname`). */
export const isEmbedPath = (pathname: string) => EMBED_PATH.test(pathname);

/** The same with an optional /ar prefix (the proxy sees the raw path). */
export const isEmbedRequestPath = (pathname: string) =>
  EMBED_REQUEST_PATH.test(pathname);

/** The popup that connects a frame (no framing, keeps its opener). */
export const isEmbedConnectPath = (pathname: string) =>
  EMBED_CONNECT_PATH.test(pathname);

/**
 * A sign-in step inside the connect popup (`return_to` is the popup): it
 * must keep the popup's link to the frame that opened it, like the popup.
 */
export const isEmbedSignIn = (pathname: string, returnTo: string | null) =>
  SIGN_IN_PATH.test(pathname) && CONNECT_RETURN.test(returnTo ?? "");

const CLIENT_ID = /^pass_[a-z0-9]{24}$/;

/** The app's client id from the query, when it looks like one. */
export const embedClientId = (value: string | null | undefined) =>
  value && CLIENT_ID.test(value) ? value : null;

/**
 * Whether `origin` is one the app may frame from: listed as is
 * (`https://auibsal.org`) or under a wildcard (`https://*.auibsal.org`).
 */
export const originAllowed = (
  origin: string | null | undefined,
  allowed: readonly string[]
) => {
  if (!origin) {
    return false;
  }
  return allowed.some((entry) => {
    if (entry === origin) {
      return true;
    }
    const wildcard = entry.match(WILDCARD_ORIGIN);
    return Boolean(
      wildcard?.[1] &&
        origin.startsWith("https://") &&
        origin.endsWith(`.${wildcard[1]}`)
    );
  });
};

/** Where the frame keeps its token (this browser, this partner's site). */
export const embedTokenKey = (clientId: string) =>
  `idea-pass-embed:${clientId}`;

/** The popup hands the frame its token with this message (same origin). */
export interface EmbedTokenMessage {
  clientId: string;
  token: string;
  type: "idea-pass-embed-token";
}

export const isEmbedTokenMessage = (
  data: unknown,
  clientId: string
): data is EmbedTokenMessage =>
  typeof data === "object" &&
  data !== null &&
  (data as EmbedTokenMessage).type === "idea-pass-embed-token" &&
  (data as EmbedTokenMessage).clientId === clientId &&
  TOKEN.test(String((data as EmbedTokenMessage).token));

/** The only message the frame sends the partner's page. */
export const heightMessage = (height: number) => ({
  height: Math.ceil(height),
  type: "idea-pass-card" as const,
});

/** The theme the partner asks for; otherwise the browser's. */
export const embedTheme = (value: string | null | undefined) =>
  value === "light" || value === "dark" ? value : null;
