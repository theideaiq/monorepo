"use client";

import { useAuth } from "@repo/auth/provider";
import { useEffect, useRef } from "react";
import { storedInvite, useClaimInvite } from "@/lib/invites";

/**
 * Once someone who followed an invite link is signed in, records who
 * invited them (the code waits on the device until then).
 */
export const InviteClaimer = () => {
  const { user } = useAuth();
  const claim = useClaimInvite();
  const tried = useRef<string | null>(null);

  useEffect(() => {
    if (!user || tried.current === user.id) {
      return;
    }
    tried.current = user.id;
    const code = storedInvite();
    if (code) {
      claim.mutate(code);
    }
  }, [user, claim]);

  return null;
};
