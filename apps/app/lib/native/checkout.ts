import { project } from "@repo/config";
import { getPurchasePolicy } from "@repo/payments";
import { detectPlatform, type Platform } from "../platform";

/**
 * Whether this screen may offer checkout for a digital good (The IDEA Plus,
 * plans): always on the web; inside the iOS/Android apps only when
 * `project.commerce.allowNativeCheckout` is on. When it returns false,
 * hide the purchase button and any link to buy on the website (App Store
 * 3.1.1 / 3.1.3 and Google Play payments policy): show the plan as
 * "managed on the website" instead.
 *
 * Physical store orders (Wayl) are not digital goods and don't need this.
 */
export const canSellDigitalGoods = (
  platform: Platform = detectPlatform(),
  allowNativeCheckout: boolean = project.commerce.allowNativeCheckout
) => getPurchasePolicy(platform, allowNativeCheckout).allowed;
