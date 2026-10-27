"use client";

import { AuthProvider } from "@repo/auth/provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { getSupabase } from "@/lib/browser-supabase";
import { InviteClaimer } from "./invite-claimer";
import { NativeBridge } from "./native-bridge";

interface AppProvidersProps {
  readonly children: ReactNode;
}

/**
 * Data fetching, the Supabase session, the native (Capacitor) bridge and
 * claiming a friend's invite once signed in.
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
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};
