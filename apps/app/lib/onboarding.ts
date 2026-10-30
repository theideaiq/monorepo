interface ProfileState {
  created_at: string;
  full_name: string | null;
  updated_at: string;
}

/**
 * Whether to show the first-run screen (name, language, marketing emails).
 * Profiles are created by a trigger at sign-up and saved by onboarding, so a
 * profile that was never updated hasn't been through it. Organizations are
 * optional; members of one were set up by the template's earlier flow.
 */
export const needsOnboarding = (
  profile: ProfileState,
  organizationCount: number
) => {
  if (!profile.full_name?.trim()) {
    return true;
  }
  const neverSaved =
    new Date(profile.updated_at).getTime() <=
    new Date(profile.created_at).getTime();
  return neverSaved && organizationCount === 0;
};
