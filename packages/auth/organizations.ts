import type { Database, OrgRole } from "@repo/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Cookie remembering the active organization for server-rendered apps. */
export const ACTIVE_ORGANIZATION_COOKIE = "active_org";

/**
 * Sections of Partners an organization switches on from Home
 * (`organizations.features`); Home and Organization are always there.
 */
export const organizationFeatures = [
  "selling",
  "perks",
  "team",
  "developers",
] as const;

export type OrganizationFeature = (typeof organizationFeatures)[number];

const isOrganizationFeature = (value: string): value is OrganizationFeature =>
  (organizationFeatures as readonly string[]).includes(value);

export interface MyOrganization {
  features: OrganizationFeature[];
  id: string;
  name: string;
  role: OrgRole;
  slug: string;
}

/** The user's organizations, oldest first (RLS-scoped). */
export const listMyOrganizations = async (
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<MyOrganization[]> => {
  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organization:organizations (id, name, slug, features)")
    .eq("user_id", userId)
    .order("created_at");

  if (error) {
    throw error;
  }

  return data.flatMap(({ organization, role }) =>
    organization
      ? [
          {
            ...organization,
            features: organization.features.filter(isOrganizationFeature),
            role,
          },
        ]
      : []
  );
};

/**
 * The organization to act in: the preferred one if the user is a member of
 * it (the cookie is client-controlled, so it is only a preference), otherwise
 * the first one.
 */
export const pickActiveOrganization = (
  organizations: MyOrganization[],
  preferredId?: string | null
) =>
  organizations.find((organization) => organization.id === preferredId) ??
  organizations[0] ??
  null;
