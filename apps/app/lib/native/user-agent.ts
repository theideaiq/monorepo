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

/**
 * Added after SHELL_USER_AGENT when the build holds Firebase's config
 * (`google-services.json` on Android, `GoogleService-Info.plist` on iOS).
 * Without it, registering for push crashes the app ("Default FirebaseApp is
 * not initialized"), so the website only asks for push when it is present.
 */
export const PUSH_USER_AGENT = "TheIDEA-Push/1";

const SHELL = /\bTheIDEA\/\d+/;
const PUSH = /\bTheIDEA-Push\/\d+/;

/** Whether this app build can receive push notifications. */
export const shellHasPush = (userAgent: string | null | undefined) =>
  Boolean(userAgent && PUSH.test(userAgent));

export const isNativeShellUserAgent = (userAgent: string | null | undefined) =>
  Boolean(userAgent && SHELL.test(userAgent));
