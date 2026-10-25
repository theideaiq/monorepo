import { localePath } from "@repo/internationalization";
import { env } from "@/env";

/** Opens the hosted checkout in this tab. */
export const openCheckout = (url: string) => {
  window.location.assign(url);
};

/** Where the payment page sends the customer back to (a page of The IDEA Spark). */
export const checkoutReturnUrl = (locale: string, path: string) =>
  `${env.NEXT_PUBLIC_APP_URL}${localePath(locale, path)}`;
