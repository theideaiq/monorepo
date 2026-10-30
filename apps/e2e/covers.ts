import { admin } from "./fixtures";

/** The cover every journey product shows: a 1×1 PNG in the local `catalog` bucket. */
export const COVER = "e2e/cover.png";
const COVER_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
/** The remote cover `supabase/seed.sql` gives the sample products. */
const SEED_COVER = "https://covers.openlibrary.org/b/id/8231856-M.jpg";

/**
 * Uploads the local cover and swaps the seeded products' remote cover for it,
 * so no journey (and no page pre-rendered at build time) waits on an outside
 * image host. CI runs it before building the apps (`bun run covers`).
 */
export const swapInLocalCovers = async () => {
  const db = admin();
  const upload = await db.storage
    .from("catalog")
    .upload(COVER, Buffer.from(COVER_PNG, "base64"), {
      contentType: "image/png",
      upsert: true,
    });
  if (upload.error) {
    throw upload.error;
  }
  const swap = await db
    .from("products")
    .update({ images: [COVER] })
    .contains("images", [SEED_COVER]);
  if (swap.error) {
    throw swap.error;
  }
};

if (import.meta.main) {
  await swapInLocalCovers();
}
