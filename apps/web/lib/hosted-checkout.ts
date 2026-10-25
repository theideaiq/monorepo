import { localePath } from "@repo/internationalization";
import { env } from "@/env";
import { isNativeApp } from "./platform";

/** Opens the hosted checkout: same tab on the web, the system browser in the apps. */
export const openCheckout = async (url: string) => {
  if (isNativeApp()) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url });
  } else {
    window.location.assign(url);
  }
};

/**
 * Where the payment page sends the customer back to. The API only accepts
 * the website's URL; the native apps return by themselves (the checkout opens
 * in the system browser), so they send none.
 */
export const checkoutReturnUrl = (locale: string, path: string) =>
  isNativeApp()
    ? undefined
    : `${env.NEXT_PUBLIC_WEB_URL}${localePath(locale, path)}`;
