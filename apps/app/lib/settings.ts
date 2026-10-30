/**
 * Pass → Settings: a list page (`/pass/settings`) and one page for each
 * section (`/pass/settings/<section>`).
 */
export const settingsSections = [
  "profile",
  "sign-in",
  "phone",
  "connections",
  "addresses",
  "notifications",
  "privacy",
  "appearance",
] as const;

export type SettingsSectionId = (typeof settingsSections)[number];

export const isSettingsSection = (value: unknown): value is SettingsSectionId =>
  typeof value === "string" &&
  (settingsSections as readonly string[]).includes(value);

/** The section's message key under `app.settings.sections`. */
export const sectionKey = (section: SettingsSectionId) =>
  section === "sign-in" ? "signIn" : section;

export const settingsPath = (section?: SettingsSectionId) =>
  section ? `/pass/settings/${section}` : "/pass/settings";
