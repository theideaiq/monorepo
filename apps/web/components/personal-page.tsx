import type { ReactNode } from "react";
import { RequireAuth, RequireOnboarding } from "./gates";
import { OrganizationProvider } from "./organization-provider";

/**
 * A page of the signed-in member's own outside The IDEA Pass's pages
 * (saved items, a support ticket): requires a session and a finished
 * onboarding. The data is protected by RLS, not by this.
 */
export const PersonalPage = ({
  children,
}: {
  readonly children: ReactNode;
}) => (
  <RequireAuth>
    <OrganizationProvider>
      <RequireOnboarding>
        <div className="container mx-auto flex max-w-3xl flex-col px-4 py-6 md:py-10">
          {children}
        </div>
      </RequireOnboarding>
    </OrganizationProvider>
  </RequireAuth>
);
