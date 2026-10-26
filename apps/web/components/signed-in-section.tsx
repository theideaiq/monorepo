"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Link } from "@repo/internationalization/navigation";
import type { ReactNode } from "react";

interface SignedInSectionProps {
  readonly children: ReactNode;
  /** The anchor other links on the page point at (`#yours`). */
  readonly id: string;
  /** Where sign-in comes back to: this page. */
  readonly returnTo: string;
  /** Why to sign in, shown to signed-out visitors. */
  readonly signedOut: string;
  readonly signIn: string;
  readonly title: string;
}

/**
 * The personal part of a public page (the Club's "Yours", "Your Plus"):
 * the member's own things when signed in, a way to sign in and come back
 * otherwise. The data is protected by RLS, not by this.
 */
export const SignedInSection = ({
  children,
  id,
  returnTo,
  signIn,
  signedOut,
  title,
}: SignedInSectionProps) => {
  const { loading, user } = useAuth();

  if (loading) {
    return null;
  }
  return (
    <section className="flex scroll-mt-24 flex-col gap-4" id={id}>
      <h2 className="font-bold text-xl">{title}</h2>
      {user ? (
        children
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">{signedOut}</p>
          <Button asChild size="sm" variant="outline">
            <Link
              href={{ pathname: "/sign-in", query: { return_to: returnTo } }}
            >
              {signIn}
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
};
