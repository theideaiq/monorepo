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
  /** Post and event covers (public); editors write. */
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
  /**
   * Photos of an item a customer returns, under "<user id>/…": the
   * customer uploads them; the shop and support read them.
   */
  returnPhotos: {
    id: "return-photos",
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
    public: false,
  },
  /** Product review photos (public) under "<user id>/…"; only the author writes. */
  reviews: {
    id: "reviews",
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
    public: true,
  },
  /**
   * Student card photos under "<user id>/…": the student uploads one,
   * support reads it and deletes it after review.
   */
  studentCards: {
    id: "student-cards",
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
    public: false,
  },
  /**
   * Documents for partners' student verifications under
   * "<verification id>/…": apps/api uploads, support reads and deletes
   * after review.
   */
  studentDocuments: {
    id: "student-documents",
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
    public: false,
  },
  /** Submitted work under "<author id>/…"; the author and editors read it. */
  submissions: {
    id: "submissions",
    maxBytes: 20 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg", "application/pdf"],
    public: false,
  },
  /**
   * Identity and educator documents under "<user id>/…": the member
   * uploads them, support reads them and deletes them after review.
   */
  verifications: {
    id: "verifications",
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
    public: false,
  },
} as const;

export type BucketKey = keyof typeof buckets;
export type BucketId = (typeof buckets)[BucketKey]["id"];
