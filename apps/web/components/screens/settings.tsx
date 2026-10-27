"use client";

import { formatPhone } from "@repo/auth/phone";
import { useAuth } from "@repo/auth/provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Label } from "@repo/design-system/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@repo/design-system/components/ui/radio-group";
import { usePathname, useRouter } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Suspense, useId } from "react";
import { DeleteAccountCard } from "@/components/account/delete-account";
import { BirthdayCard } from "@/components/birthday-settings";
import { ConnectedSites } from "@/components/connected-sites";
import { GuardianCard } from "@/components/guardian-settings";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/profile-form";
import { SectionSpinner } from "@/components/states";
import { StudentCard } from "@/components/student-settings";
import { TelegramSettingsCard } from "@/components/telegram-settings";
import { WhatsAppSettingsCard } from "@/components/whatsapp-settings";
import { useProfile } from "@/lib/queries";

const THEMES = ["light", "dark", "system"] as const;

const Appearance = () => {
  const t = useTranslations();
  const id = useId();
  const { setTheme, theme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("app.settings.appearance.title")}</CardTitle>
        <CardDescription>
          {t("app.settings.appearance.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <fieldset className="grid gap-2">
          <legend className="mb-2 font-medium text-sm">
            {t("app.settings.appearance.theme")}
          </legend>
          <RadioGroup
            className="flex flex-wrap gap-6"
            onValueChange={setTheme}
            value={theme ?? "system"}
          >
            {THEMES.map((option) => (
              <div className="flex items-center gap-2" key={option}>
                <RadioGroupItem id={`${id}-${option}`} value={option} />
                <Label htmlFor={`${id}-${option}`}>
                  {t(`common.theme.${option}`)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </fieldset>
      </CardContent>
    </Card>
  );
};

export const Settings = () => {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const profile = useProfile();

  return (
    <>
      <PageHeader title={t("app.settings.title")} />
      <div className="flex max-w-2xl flex-1 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("app.settings.profile.title")}</CardTitle>
            <CardDescription>
              {t("app.settings.profile.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {user?.email ? (
              <div className="grid gap-1 text-sm">
                <span className="text-muted-foreground">
                  {t("app.settings.profile.email")}
                </span>
                <span className="text-start" dir="ltr">
                  {user.email}
                </span>
              </div>
            ) : null}
            {user?.phone ? (
              <div className="grid gap-1 text-sm">
                <span className="text-muted-foreground">
                  {t("app.settings.profile.phone")}
                </span>
                <span className="text-start" dir="ltr">
                  {formatPhone(user.phone)}
                </span>
              </div>
            ) : null}
            {profile.data ? (
              <ProfileForm
                initialMarketingOptIn={profile.data.marketing_opt_in}
                initialName={profile.data.full_name ?? ""}
                onSaved={(language) => {
                  if (language !== locale) {
                    router.replace(pathname, { locale: language });
                  }
                }}
                showSaved
                submitLabel={t("common.save")}
              />
            ) : (
              <SectionSpinner />
            )}
          </CardContent>
        </Card>
        <BirthdayCard />
        <StudentCard />
        <ConnectedSites />
        <Suspense>
          <GuardianCard />
        </Suspense>
        <WhatsAppSettingsCard />
        <TelegramSettingsCard />
        <Appearance />
        <DeleteAccountCard />
      </div>
    </>
  );
};
