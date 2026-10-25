"use client";

import { useAuth } from "@repo/auth/provider";
import { useEffect, useRef } from "react";
import { storedAffiliate, useTouchAffiliate } from "@/lib/affiliates";

/**
 * Once someone who followed an affiliate's link is signed in, records the
 * link (the code waits on the device until then).
 */
export const AffiliateToucher = () => {
  const { user } = useAuth();
  const touch = useTouchAffiliate();
  const tried = useRef<string | null>(null);

  useEffect(() => {
    if (!user || tried.current === user.id) {
      return;
    }
    tried.current = user.id;
    const code = storedAffiliate();
    if (code) {
      touch.mutate({ code, via: "link" });
    }
  }, [user, touch]);

  return null;
};
