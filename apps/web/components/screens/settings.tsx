"use client";

import { formatPhone } from "@repo/auth/phone";
import { useAuth } from "@repo/auth/provider";
import type { SocialProvider } from "@repo/auth/social";
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
import { type ReactNode, Suspense, useId } from "react";
import { DeleteAccountCard } from "@/components/account/delete-account";
import { AddressBookCard } from "@/components/address-book-settings";
import { BirthdayCard } from "@/components/birthday-settings";
import { ConnectedSites } from "@/components/connected-sites";
import { GuardianCard } from "@/components/guardian-settings";
import { PageHeader } from "@/components/page-header";
import { PasswordSettingsCard } from "@/components/password-settings";
import { ProfileForm } from "@/components/profile-form";
import { SignInMethodsCard } from "@/components/sign-in-methods";
import { SectionSpinner } from "@/components/states";
import { TelegramSettingsCard } from "@/components/telegram-settings";
import { VerificationLinkCard } from "@/components/verification-settings";
import { VerifiedPhonesCard } from "@/components/verify-phone";
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

const SECTIONS = ["profile", "email", "phone", "connections", "more"] as const;

type SectionId = (typeof SECTIONS)[number];

/** One group of settings, under its heading. */
const Section = ({
  children,
  id,
}: {
  readonly children: ReactNode;
  readonly id: SectionId;
}) => {
  const t = useTranslations("app.settings.sections");
  return (
    <section aria-labelledby={`settings-${id}`} className="grid gap-4" id={id}>
      <div>
        <h2 className="font-semibold text-lg" id={`settings-${id}`}>
          {t(`${id}.title`)}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t(`${id}.description`)}
        </p>
      </div>
      {children}
    </section>
  );
};

/** The sign-in email, shown where it can be read and copied. */
const EmailCard = ({ email }: { readonly email: string }) => {
  const t = useTranslations("app.settings.profile");
  return (
    <Card>
      <CardContent className="grid gap-1 pt-6 text-sm">
        <span className="text-muted-foreground">{t("email")}</span>
        <span className="text-start" dir="ltr">
          {email}
        </span>
      </CardContent>
    </Card>
  );
};

/**
 * Your Pass → Settings, in groups: your profile; Email (the address you
 * sign in with and its password); Phone (verified numbers and WhatsApp
 * updates); Connections (sign-in accounts, Telegram and connected sites);
 * then addresses, birthday, guardian, verification, appearance and
 * deleting the Pass.
 */
export const Settings = ({
  providers = [],
}: {
  readonly providers?: SocialProvider[];
}) => {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const profile = useProfile();

  return (
    <>
      <PageHeader title={t("app.settings.title")} />
      <div className="flex max-w-2xl flex-1 flex-col gap-8">
        <nav
          aria-label={t("app.settings.sections.label")}
          className="flex flex-wrap gap-2"
        >
          {SECTIONS.map((id) => (
            <a
              className="rounded-full border px-3 py-1 text-sm hover:bg-muted"
              href={`#${id}`}
              key={id}
            >
              {t(`app.settings.sections.${id}.title`)}
            </a>
          ))}
        </nav>
        <Section id="profile">
          <Card>
            <CardHeader>
              <CardTitle>{t("app.settings.profile.title")}</CardTitle>
              <CardDescription>
                {t("app.settings.profile.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
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
        </Section>
        <Section id="email">
          {user?.email ? <EmailCard email={user.email} /> : null}
          <PasswordSettingsCard />
        </Section>
        <Section id="phone">
          {user?.phone ? (
            <p className="text-sm">
              {t("app.settings.profile.phone")}:{" "}
              <span dir="ltr">{formatPhone(user.phone)}</span>
            </p>
          ) : null}
          <VerifiedPhonesCard />
          <WhatsAppSettingsCard />
        </Section>
        <Section id="connections">
          <SignInMethodsCard providers={providers} />
          <TelegramSettingsCard />
          <ConnectedSites />
        </Section>
        <Section id="more">
          <AddressBookCard />
          <BirthdayCard />
          <Suspense>
            <GuardianCard />
          </Suspense>
          <VerificationLinkCard />
          <Appearance />
          <DeleteAccountCard />
        </Section>
      </div>
    </>
  );
};
