import "server-only";

import type { createAdminClient } from "@repo/database/admin";
import { buckets, removeFiles } from "@repo/storage";

/**
 * Passport scans for The IDEA's programs are deleted 30 days after the
 * application or the program ends: `sweep_program_documents` forgets them
 * and returns their paths, which are removed from storage here. Returns how
 * many files were removed.
 */
export const sweepProgramDocuments = async (
  admin: ReturnType<typeof createAdminClient>
) => {
  const { data, error } = await admin.rpc("sweep_program_documents");
  if (error) {
    throw new Error(`sweep_program_documents: ${error.message}`);
  }
  const paths = (data ?? []).flatMap((row) => row.files ?? []);
  if (paths.length > 0) {
    await removeFiles(admin, buckets.programDocuments.id, paths);
  }
  return paths.length;
};
