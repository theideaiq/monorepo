import type { Database } from "@repo/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type BucketId, buckets } from "./buckets";
import { checkFile, fileNameOf, objectPath, StorageError } from "./files";

/**
 * File storage on Supabase Storage. Every helper takes the caller's Supabase
 * client (browser, server or native), so the bucket policies decide what the
 * signed-in user may read and write.
 */

type Client = SupabaseClient<Database>;

const TRAILING_SLASH = /\/$/;

export interface StoredFile {
  /** Original file name, which may contain any characters. */
  name: string;
  path: string;
  size: number;
  type: string;
}

const upload = async (
  supabase: Client,
  bucket: BucketId,
  path: string,
  file: File
): Promise<StoredFile> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error || !data) {
    throw new StorageError(
      "upload_failed",
      `Upload to ${bucket} failed: ${error?.message ?? "no data"}`
    );
  }

  return { name: file.name, path: data.path, size: file.size, type: file.type };
};

const assertAllowed = (bucket: keyof typeof buckets, file: File) => {
  const problem = checkFile(bucket, file);
  if (problem) {
    throw new StorageError(problem, `${file.name}: ${problem}`);
  }
};

/** Uploads a private file for an organization the user belongs to. */
export const uploadOrganizationFile = (
  supabase: Client,
  organizationId: string,
  file: File
) => {
  assertAllowed("orgFiles", file);
  return upload(
    supabase,
    buckets.orgFiles.id,
    objectPath(organizationId, file.name),
    file
  );
};

/** Uploads the signed-in user's profile picture; returns its public URL. */
export const uploadAvatar = async (
  supabase: Client,
  userId: string,
  file: File
) => {
  assertAllowed("avatars", file);
  const stored = await upload(
    supabase,
    buckets.avatars.id,
    objectPath(userId, file.name),
    file
  );
  return { ...stored, url: getAvatarUrl(supabase, stored.path) };
};

/** Public URL of an avatar. Avatars are readable by anyone with the URL. */
export const getAvatarUrl = (supabase: Client, path: string) =>
  supabase.storage.from(buckets.avatars.id).getPublicUrl(path).data.publicUrl;

/**
 * A time-limited link to a private organization file. With `download`,
 * browsers save it under its original name (or the name you pass).
 */
export const getOrganizationFileUrl = async (
  supabase: Client,
  path: string,
  {
    download,
    expiresIn = 60 * 60,
  }: { download?: string | boolean; expiresIn?: number } = {}
) => {
  const { data, error } = await supabase.storage
    .from(buckets.orgFiles.id)
    .createSignedUrl(path, expiresIn, {
      download: download === true ? fileNameOf(path) : download,
    });

  if (error || !data) {
    throw new StorageError(
      "not_found",
      `No signed URL for ${path}: ${error?.message ?? "no data"}`
    );
  }
  return data.signedUrl;
};

/** Files in an organization's folder, newest first. */
export const listOrganizationFiles = async (
  supabase: Client,
  organizationId: string,
  { limit = 100, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<(StoredFile & { createdAt: string | null })[]> => {
  const { data, error } = await supabase.storage
    .from(buckets.orgFiles.id)
    .list(organizationId, {
      limit,
      offset,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    throw new StorageError("request_failed", error.message);
  }

  // Folders have no id; files carry their size and type in metadata.
  return (data ?? []).flatMap((object) => {
    if (object.id === null) {
      return [];
    }
    const path = `${organizationId}/${object.name}`;
    return [
      {
        createdAt: object.created_at,
        name: fileNameOf(path),
        path,
        size: object.metadata?.size ?? 0,
        type: object.metadata?.mimetype ?? "",
      },
    ];
  });
};

/** Public URL of a catalog image or an editorial cover. */
export const getPublicFileUrl = (
  supabase: Client,
  bucket: typeof buckets.catalog.id | typeof buckets.editorial.id,
  path: string
) => supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

/**
 * Public URL without a client, for server components and emails:
 * `<supabase url>/storage/v1/object/public/<bucket>/<path>`.
 */
export const publicFileUrl = (
  supabaseUrl: string,
  bucket:
    | typeof buckets.catalog.id
    | typeof buckets.editorial.id
    | typeof buckets.reviews.id,
  path: string
) =>
  `${supabaseUrl.replace(TRAILING_SLASH, "")}/storage/v1/object/public/${bucket}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

/** Uploads a public catalog image or editorial file (staff only). */
export const uploadPublicFile = (
  supabase: Client,
  bucket: "catalog" | "editorial",
  folder: string,
  file: File
) => {
  assertAllowed(bucket, file);
  return upload(
    supabase,
    buckets[bucket].id,
    objectPath(folder, file.name),
    file
  );
};

/** Uploads a file for one of the signed-in user's submissions. */
export const uploadSubmissionFile = (
  supabase: Client,
  userId: string,
  file: File
) => {
  assertAllowed("submissions", file);
  return upload(
    supabase,
    buckets.submissions.id,
    objectPath(userId, file.name),
    file
  );
};

/** A time-limited link to a submission file (its author or an editor). */
export const getSubmissionFileUrl = async (
  supabase: Client,
  path: string,
  expiresIn = 60 * 60
) => {
  const { data, error } = await supabase.storage
    .from(buckets.submissions.id)
    .createSignedUrl(path, expiresIn);
  if (error || !data) {
    throw new StorageError(
      "not_found",
      `No signed URL for ${path}: ${error?.message ?? "no data"}`
    );
  }
  return data.signedUrl;
};

/** Uploads a candidate's CV (support) into the hiring company's folder. */
export const uploadCandidateCv = (
  supabase: Client,
  organizationId: string,
  file: File
) => {
  assertAllowed("candidates", file);
  return upload(
    supabase,
    buckets.candidates.id,
    objectPath(organizationId, file.name),
    file
  );
};

/** A time-limited link to a candidate's CV (the company or support). */
export const getCandidateCvUrl = async (
  supabase: Client,
  path: string,
  expiresIn = 60 * 10
) => {
  const { data, error } = await supabase.storage
    .from(buckets.candidates.id)
    .createSignedUrl(path, expiresIn);
  if (error || !data) {
    throw new StorageError(
      "not_found",
      `No signed URL for ${path}: ${error?.message ?? "no data"}`
    );
  }
  return data.signedUrl;
};

/** Uploads a photo for one of the signed-in user's "Sell to us" requests. */
export const uploadTradeInPhoto = (
  supabase: Client,
  userId: string,
  file: File
) => {
  assertAllowed("tradeIns", file);
  return upload(
    supabase,
    buckets.tradeIns.id,
    objectPath(userId, file.name),
    file
  );
};

/** Uploads a photo for a product review, under the author's folder. */
export const uploadReviewPhoto = (
  supabase: Client,
  userId: string,
  file: File
) => {
  assertAllowed("reviews", file);
  return upload(
    supabase,
    buckets.reviews.id,
    objectPath(userId, file.name),
    file
  );
};

/**
 * Time-limited links to trade-in photos (their owner or support), in the
 * order given; a photo that can't be signed is null.
 */
export const getTradeInPhotoUrls = async (
  supabase: Client,
  paths: string[],
  expiresIn = 60 * 60
): Promise<(string | null)[]> => {
  if (paths.length === 0) {
    return [];
  }
  const { data, error } = await supabase.storage
    .from(buckets.tradeIns.id)
    .createSignedUrls(paths, expiresIn);
  if (error || !data) {
    throw new StorageError(
      "not_found",
      `No signed URLs: ${error?.message ?? "no data"}`
    );
  }
  const byPath = new Map(
    data.map((entry) => [entry.path, entry.error ? null : entry.signedUrl])
  );
  return paths.map((path) => byPath.get(path) ?? null);
};

/** Uploads a photo of the signed-in student's card, for review. */
export const uploadStudentCard = (
  supabase: Client,
  userId: string,
  file: File
) => {
  assertAllowed("studentCards", file);
  return upload(
    supabase,
    buckets.studentCards.id,
    objectPath(userId, file.name),
    file
  );
};

/** A time-limited link to a student card photo (its owner or support). */
export const getStudentCardUrl = async (
  supabase: Client,
  path: string,
  expiresIn = 10 * 60
) => {
  const { data, error } = await supabase.storage
    .from(buckets.studentCards.id)
    .createSignedUrl(path, expiresIn);
  if (error || !data) {
    throw new StorageError(
      "not_found",
      `No signed URL: ${error?.message ?? "no data"}`
    );
  }
  return data.signedUrl;
};

/** Deletes files the user is allowed to delete. */
export const removeFiles = async (
  supabase: Client,
  bucket: BucketId,
  paths: string[]
) => {
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) {
    throw new StorageError("request_failed", error.message);
  }
};

const LIST_PAGE = 1000;

/** Every file path under a folder, including subfolders. */
const listFolder = async (
  supabase: Client,
  bucket: BucketId,
  folder: string
): Promise<string[]> => {
  const paths: string[] = [];
  const folders = [folder];

  while (folders.length > 0) {
    const current = folders.pop() as string;
    let offset = 0;

    for (;;) {
      // biome-ignore lint/performance/noAwaitInLoops: pages are sequential
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(current, { limit: LIST_PAGE, offset });
      if (error) {
        throw new StorageError("request_failed", error.message);
      }
      for (const object of data ?? []) {
        // Folders have no id.
        (object.id === null ? folders : paths).push(
          `${current}/${object.name}`
        );
      }
      if ((data ?? []).length < LIST_PAGE) {
        break;
      }
      offset += LIST_PAGE;
    }
  }

  return paths;
};

/**
 * Deletes a whole folder, such as `<organization id>` in org-files or
 * `<user id>` in avatars. Used with the admin client when an organization or
 * an account is deleted; returns how many files were removed.
 */
export const removeFolder = async (
  supabase: Client,
  bucket: BucketId,
  folder: string
) => {
  const paths = await listFolder(supabase, bucket, folder);

  for (let start = 0; start < paths.length; start += LIST_PAGE) {
    // biome-ignore lint/performance/noAwaitInLoops: bounded batches
    await removeFiles(supabase, bucket, paths.slice(start, start + LIST_PAGE));
  }

  return paths.length;
};

export { type BucketId, type BucketKey, buckets } from "./buckets";
export {
  checkFile,
  decodeFileName,
  encodeFileName,
  type FileProblem,
  fileNameOf,
  StorageError,
} from "./files";
