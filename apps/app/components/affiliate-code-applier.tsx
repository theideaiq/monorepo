"use client";

import { useAuth } from "@repo/auth/provider";
import { useEffect, useRef } from "react";
import {
  storedAffiliateCode,
  useApplyAffiliateCode,
} from "@/lib/affiliate-code";

/**
 * Once someone who followed a partner's link is signed in, puts the
 * partner's code on their cart (it waits on the device until then).
 */
export const AffiliateCodeApplier = () => {
  const { user } = useAuth();
  const apply = useApplyAffiliateCode();
  const tried = useRef<string | null>(null);

  useEffect(() => {
    if (!user || tried.current === user.id) {
      return;
    }
    tried.current = user.id;
    const code = storedAffiliateCode();
    if (code) {
      apply.mutate(code);
    }
  }, [user, apply]);

  return null;
};
