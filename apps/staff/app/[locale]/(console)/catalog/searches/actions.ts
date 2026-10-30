"use server";

import { z } from "zod";
import { affected, staffAction } from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";

/** Clears a search that found nothing, once the catalog has it. */
export const clearSearchMiss = staffAction(
  "catalog",
  z.object({ term: z.string().min(1).max(80) }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("search_misses")
        .delete()
        .eq("term", input.term)
        .select("term")
    );
    return success();
  }
);
