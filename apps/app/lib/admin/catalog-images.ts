/**
 * Product images are storage paths in the public `catalog` bucket or https
 * links to the cover-art sources that `catalogImagePatterns`
 * (packages/next-config) lets Next.js optimise. Remote covers are shown
 * through next/image, so the browser only loads them from this origin (the
 * Content Security Policy blocks third-party images).
 */

/** Hosts a product image link may point to (see `catalogImagePatterns`). */
export const REMOTE_IMAGE_HOSTS = [
  "coverartarchive.org",
  "archive.org",
  "covers.openlibrary.org",
  "upload.wikimedia.org",
] as const;

const STORAGE_PATH = /^(?!.*\.\.)[\w!.()+, /-]{1,700}$/;
const MAX_URL_LENGTH = 700;

/** True for an https link to one of the allowed cover-art hosts. */
export const isRemoteCatalogImage = (value: string) => {
  if (!value.startsWith("https://") || value.length > MAX_URL_LENGTH) {
    return false;
  }
  try {
    const url = new URL(value);
    if (url.username || url.password || url.port) {
      return false;
    }
    return REMOTE_IMAGE_HOSTS.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
};

/** True for a value that may be stored in `products.images`. */
export const isCatalogImage = (value: string) =>
  isRemoteCatalogImage(value) || STORAGE_PATH.test(value);
