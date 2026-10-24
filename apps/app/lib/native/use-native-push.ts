"use client";

import type { Database } from "@repo/database";
import { useRouter } from "@repo/internationalization/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect } from "react";
import { registerPushNotifications } from "./push";

/**
 * Registers for push notifications once someone is signed in, inside the
 * iOS/Android apps only (a no-op on the web). Taps on a notification open
 * its link in the current language. Mount it once, in a client component
 * under the signed-in layout:
 *
 *   useNativePush(supabase, user?.id);
 */
export const useNativePush = (
  supabase: SupabaseClient<Database>,
  userId: string | null | undefined
) => {
  const router = useRouter();

  useEffect(() => {
    if (!userId) {
      return;
    }
    let cleanup: (() => void) | undefined;
    let disposed = false;

    registerPushNotifications({
      onOpen: (path) => router.push(path),
      supabase,
    })
      .then((dispose) => {
        if (disposed) {
          dispose();
        } else {
          cleanup = dispose;
        }
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [router, supabase, userId]);
};
