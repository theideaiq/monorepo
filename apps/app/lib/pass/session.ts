import "server-only";

import { createClient } from "@repo/auth/server";
import { cache } from "react";

/**
 * The signed-in user (verified with the Auth server), their session's
 * assurance level and authenticator apps. Cached per request.
 */
export const getPassSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const totp = (user.factors ?? []).filter(
    (factor) => factor.factor_type === "totp" && factor.status === "verified"
  );

  return {
    aal: aal?.currentLevel ?? "aal1",
    supabase,
    totpFactorId: totp[0]?.id ?? null,
    user,
  };
});
