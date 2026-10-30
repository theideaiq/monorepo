import { enabledProviders } from "@repo/auth/social";
import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SettingsSection } from "@/components/screens/settings";
import { env } from "@/env";
import {
  isSettingsSection,
  sectionKey,
  settingsSections,
} from "@/lib/settings";

interface SettingsSectionProps {
  params: Promise<{ locale: Locale; section: string }>;
}

export const dynamicParams = false;

export const generateStaticParams = () =>
  settingsSections.map((section) => ({ section }));

export const generateMetadata = async ({
  params,
}: SettingsSectionProps): Promise<Metadata> => {
  const { locale, section } = await params;
  if (!isSettingsSection(section)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "app.settings" });
  return { title: t(`sections.${sectionKey(section)}.title`) };
};

/** `/pass/settings/<section>`: one section of Settings. */
const SettingsSectionPage = async ({ params }: SettingsSectionProps) => {
  const { section } = await params;
  if (!isSettingsSection(section)) {
    notFound();
  }
  return (
    <SettingsSection
      providers={enabledProviders(env.NEXT_PUBLIC_AUTH_PROVIDERS)}
      section={section}
    />
  );
};

export default SettingsSectionPage;
