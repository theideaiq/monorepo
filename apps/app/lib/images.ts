import { productImageUrl } from "@repo/commerce/catalog";
import { publicFileUrl } from "@repo/storage";
import { env } from "@/env";

const supabaseUrl = () => env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** A product (or variant) image path in the `catalog` bucket, as a URL. */
export const catalogImage = (path: string | null | undefined) =>
  path ? productImageUrl(supabaseUrl(), path) : null;

/** A review photo in the public `reviews` bucket, as a URL. */
export const reviewImage = (path: string) =>
  publicFileUrl(supabaseUrl(), "reviews", path);

/** An event cover in the public `editorial` bucket, as a URL. */
export const editorialImage = (path: string | null | undefined) => {
  if (!path) {
    return null;
  }
  return path.startsWith("https://")
    ? path
    : publicFileUrl(supabaseUrl(), "editorial", path);
};
