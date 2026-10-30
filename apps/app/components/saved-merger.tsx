"use client";

import { useAuth } from "@repo/auth/provider";
import { useEffect, useRef } from "react";
import { clearLocalSaved, localSaved } from "@/lib/local-saved";
import { useSaveProducts } from "@/lib/wishlist-queries";

/**
 * Once someone who hearted products while signed out signs in, moves those
 * hearts from the browser into Saved.
 */
export const SavedMerger = () => {
  const { user } = useAuth();
  const save = useSaveProducts();
  const tried = useRef<string | null>(null);

  useEffect(() => {
    if (!user || tried.current === user.id) {
      return;
    }
    tried.current = user.id;
    const ids = localSaved();
    if (ids.length > 0) {
      save.mutate(ids, { onSuccess: clearLocalSaved });
    }
  }, [user, save]);

  return null;
};
