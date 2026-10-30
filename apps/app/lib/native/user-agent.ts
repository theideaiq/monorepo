/**
 * The iOS/Android shell appends this to the WebView's user agent
 * (`appendUserAgent` in capacitor.config.ts). On the client prefer
 * `isNativeApp()`; on the server (no `window.Capacitor`) read the request's
 * user agent:
 *
 *   isNativeShellUserAgent((await headers()).get("user-agent"))
 *
 * It's a hint for presentation (hide checkout of digital goods, skip ad
 * pixels), never for authorization: anyone can send any user agent.
 */
export const SHELL_USER_AGENT = "TheIDEA/1";

const SHELL = /\bTheIDEA\/\d+/;

export const isNativeShellUserAgent = (userAgent: string | null | undefined) =>
  Boolean(userAgent && SHELL.test(userAgent));
