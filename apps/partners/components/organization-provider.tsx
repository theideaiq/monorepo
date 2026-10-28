"use client";

import {
  type OrganizationMembership,
  pickActiveOrganization,
} from "@repo/auth/organizations";
import { createContext, type ReactNode, use, useMemo, useState } from "react";
import {
  readActiveOrganization,
  rememberActiveOrganization,
} from "@/lib/active-organization";
import { useMemberships } from "@/lib/queries";
import { ErrorState, FullPageSpinner } from "./states";

interface OrganizationContextValue {
  /** The organization the user works in, or null without any. */
  active: OrganizationMembership | null;
  /** True for owners and admins of the active organization. */
  canManage: boolean;
  organizations: OrganizationMembership[];
  select: (organizationId: string) => void;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(
  null
);

/**
 * Loads the user's organizations (business accounts, Partners) and picks
 * the active one: the last one used, if the user is still a member.
 * Organizations are optional: customers without one use the rest of the
 * app normally, and the Business section offers to create or join one.
 */
export const OrganizationProvider = ({
  children,
}: {
  readonly children: ReactNode;
}) => {
  const memberships = useMemberships();
  const [preferredId, setPreferredId] = useState(readActiveOrganization);
  const organizations = memberships.data;

  const value = useMemo(() => {
    if (!organizations) {
      return null;
    }
    const active = pickActiveOrganization(organizations, preferredId);
    return {
      active,
      canManage: active?.role === "owner" || active?.role === "admin",
      organizations,
      select: (organizationId: string) => {
        rememberActiveOrganization(organizationId);
        setPreferredId(organizationId);
      },
    };
  }, [organizations, preferredId]);

  if (memberships.isError) {
    return <ErrorState onRetry={() => memberships.refetch()} />;
  }

  if (!value) {
    return <FullPageSpinner />;
  }

  return <OrganizationContext value={value}>{children}</OrganizationContext>;
};

export const useOrganization = () => {
  const context = use(OrganizationContext);

  if (!context) {
    throw new Error(
      "useOrganization must be used inside <OrganizationProvider>."
    );
  }

  return context;
};

/**
 * The active organization, inside <RequireOrganization> (Business screens).
 */
export const useActiveOrganization = () => {
  const context = useOrganization();

  if (!context.active) {
    throw new Error(
      "useActiveOrganization must be used inside <RequireOrganization>."
    );
  }

  return { ...context, active: context.active };
};
