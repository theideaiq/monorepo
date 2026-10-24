/**
 * A post-sign-in destination taken from the URL. Only paths inside this app
 * are accepted, never absolute or protocol-relative URLs (open redirects).
 */
export const safeNextPath = (value: string | null | undefined) =>
  value?.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : null;

const LEGACY_DETAIL_PAGES: Record<string, [string, string]> = {
  "/orders/view": ["/orders", "id"],
  "/store/product": ["/store", "slug"],
  "/support/view": ["/support", "id"],
};

/**
 * Detail pages took a query parameter while the app was a static export
 * (`/orders/view?id=…`); links stored with that shape (notifications) open
 * the page's own URL (`/orders/…`). Other paths are returned unchanged.
 */
export const currentAppPath = (path: string) => {
  const url = new URL(path, "http://spark.invalid");
  const legacy = LEGACY_DETAIL_PAGES[url.pathname];
  const value = legacy ? url.searchParams.get(legacy[1]) : null;
  if (!(legacy && value)) {
    return path;
  }
  url.searchParams.delete(legacy[1]);
  const query = url.searchParams.toString();
  return `${legacy[0]}/${encodeURIComponent(value)}${query ? `?${query}` : ""}`;
};
