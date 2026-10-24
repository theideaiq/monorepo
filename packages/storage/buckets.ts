/**
 * Buckets created by supabase/migrations/…_storage.sql. Limits mirror the
 * bucket settings so uploads fail fast with a clear error before the
 * request is sent; the bucket enforces them either way.
 */
export const buckets = {
  /** Public profile pictures, under "<user id>/…"; only the owner writes. */
  avatars: {
    id: "avatars",
    maxBytes: 2 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
    public: true,
  },
  /** Product images (public); admins write. */
  catalog: {
    id: "catalog",
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
    public: true,
  },
  /** Post and event covers and journal PDFs (public); editors write. */
  editorial: {
    id: "editorial",
    maxBytes: 50 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
    public: true,
  },
  /** Private files under "<organization id>/…"; members read and write. */
  orgFiles: {
    id: "org-files",
    maxBytes: 50 * 1024 * 1024,
    mimeTypes: undefined,
    public: false,
  },
  /** Submitted work under "<author id>/…"; the author and editors read it. */
  submissions: {
    id: "submissions",
    maxBytes: 20 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg", "application/pdf"],
    public: false,
  },
  /** "Sell to us" photos under "<user id>/…"; the customer and support read them. */
  tradeIns: {
    id: "trade-ins",
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
    public: false,
  },
} as const;

export type BucketKey = keyof typeof buckets;
export type BucketId = (typeof buckets)[BucketKey]["id"];
