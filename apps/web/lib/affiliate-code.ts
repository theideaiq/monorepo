"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { affiliateCode } from "./affiliate-link";
import { unwrap } from "./queries";

/**
 * An affiliate's link, theideaiq.com/a/<code>: the code (a 5% coupon)
 * waits on the device for 30 days and goes on the member's cart once
 * they're signed in (`apply_coupon`), like a code typed at checkout.
 */

const STORAGE_KEY = "idea-affiliate";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const rememberAffiliateCode = (code: string) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ code, savedAt: Date.now() })
    );
  } catch {
    // Storage blocked: the code works only if applied right away.
  }
};

/** The remembered code, unless it's older than 30 days. */
export const storedAffiliateCode = (): string | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const { code, savedAt } = JSON.parse(raw) as {
      code?: string;
      savedAt?: number;
    };
    if (!(code && savedAt) || Date.now() - savedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return affiliateCode(code);
  } catch {
    return null;
  }
};

export const forgetAffiliateCode = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored.
  }
};

/** Puts the code on the cart; returns why it can't be used, or null. */
export const useApplyAffiliateCode = () => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const problem = unwrap(
        await supabase.rpc("apply_coupon", { entered: code })
      ) as string | null;
      // Applied, or never going to apply: either way it's done.
      forgetAffiliateCode();
      return problem;
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["checkout-quote"] }),
  });
};
