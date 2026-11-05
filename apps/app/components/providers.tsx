"use client";

import { AuthProvider } from "@repo/auth/provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { getSupabase } from "@/lib/browser-supabase";
import { AffiliateCodeApplier } from "./affiliate-code-applier";
import { InviteClaimer } from "./invite-claimer";
import { NativeBridge } from "./native-bridge";
import { SavedMerger } from "./saved-merger";
import { TelegramShell } from "./telegram-shell";

interface AppProvidersProps {
  readonly children: ReactNode;
}

/**
 * Data fetching, the Supabase session, the native (Capacitor) bridge, and
 * once signed in, claiming a friend's invite, putting a partner's code on
 * the cart and moving hearts saved in the browser into Saved; inside
 * Telegram (the Droid's Mini App), Telegram's colors and back button.
 */
export const AppProviders = ({ children }: AppProvidersProps) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
        },
      })
  );
  const [supabase] = useState(getSupabase);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider client={supabase}>
        <NativeBridge />
        <InviteClaimer />
        <AffiliateCodeApplier />
        <SavedMerger />
        <TelegramShell />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};
