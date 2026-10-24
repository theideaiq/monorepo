import { isNativeApp } from "../platform";

export interface ShareContent {
  text?: string;
  title?: string;
  url: string;
}

/**
 * `shared`: a share sheet was used; `copied`: no share sheet, the link went
 * to the clipboard (show `app.native.share.copied`); `dismissed`: the person
 * closed the sheet; `unavailable`: nothing worked.
 */
export type ShareOutcome = "shared" | "copied" | "dismissed" | "unavailable";

const CANCELED = /cancel/i;

const isAbort = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AbortError" || CANCELED.test(error.message));

/**
 * Opens the system share sheet: `@capacitor/share` in the iOS/Android apps,
 * the Web Share API in browsers that have it, and otherwise copies the link.
 */
export const shareLink = async (
  content: ShareContent,
  nav: Navigator = navigator
): Promise<ShareOutcome> => {
  try {
    if (isNativeApp()) {
      const { Share } = await import("@capacitor/share");
      await Share.share({ ...content, dialogTitle: content.title });
      return "shared";
    }
    if (typeof nav.share === "function") {
      await nav.share(content);
      return "shared";
    }
  } catch (error) {
    if (isAbort(error)) {
      return "dismissed";
    }
  }

  try {
    await nav.clipboard.writeText(content.url);
    return "copied";
  } catch {
    return "unavailable";
  }
};
