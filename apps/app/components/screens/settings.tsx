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
import {
  Link,
  usePathname,
  useRouter,
} from "@repo/internationalization/navigation";
import {
  BellIcon,
  ChevronRightIcon,
  KeyRoundIcon,
  LinkIcon,
  type LucideIcon,
  MapPinIcon,
  MoveLeft,
  PaletteIcon,
  ShieldIcon,
  SmartphoneIcon,
  UserIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { type ReactNode, useId } from "react";
import { DeleteAccountCard } from "@/components/account/delete-account";
import { AddressBookCard } from "@/components/address-book-settings";
import { BirthdayCard } from "@/components/birthday-settings";
import { ConnectedSites } from "@/components/connected-sites";
import { PageHeader } from "@/components/page-header";
import { PasswordSettingsCard } from "@/components/password-settings";
import { ProfileForm } from "@/components/profile-form";
import { SignInMethodsCard } from "@/components/sign-in-methods";
import { SectionSpinner } from "@/components/states";
import { VerificationLinkCard } from "@/components/verification-settings";
import { VerifiedPhonesCard } from "@/components/verify-phone";
import { MessagesSettings } from "@/components/whatsapp-settings";
import { useProfile } from "@/lib/queries";
import {
  type SettingsSectionId,
  sectionKey,
  settingsPath,
  settingsSections,
} from "@/lib/settings";

const THEMES = ["light", "dark", "system"] as const;

const ICONS: Record<SettingsSectionId, LucideIcon> = {
  addresses: MapPinIcon,
  appearance: PaletteIcon,
  connections: LinkIcon,
  notifications: BellIcon,
  phone: SmartphoneIcon,
  privacy: ShieldIcon,
  profile: UserIcon,
  "sign-in": KeyRoundIcon,
};

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

const Profile = () => {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const profile = useProfile();
  return (
    <>
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
      <VerificationLinkCard />
    </>
  );
};

const Phone = () => {
  const t = useTranslations("app.settings.profile");
  const { user } = useAuth();
  return (
    <>
      {user?.phone ? (
        <p className="text-sm">
          {t("phone")}: <span dir="ltr">{formatPhone(user.phone)}</span>
        </p>
      ) : null}
      <VerifiedPhonesCard />
    </>
  );
};

const SignIn = ({ providers }: { readonly providers: SocialProvider[] }) => {
  const { user } = useAuth();
  return (
    <>
      {user?.email ? <EmailCard email={user.email} /> : null}
      <PasswordSettingsCard />
      <SignInMethodsCard providers={providers} />
    </>
  );
};

/** What we send: WhatsApp updates to a verified number, news and offers. */
const Notifications = () => (
  <Card>
    <CardContent className="[&>div]:border-t-0 [&>div]:pt-0">
      <MessagesSettings />
    </CardContent>
  </Card>
);

const SECTION_BODY: Record<
  SettingsSectionId,
  (props: { providers: SocialProvider[] }) => ReactNode
> = {
  addresses: () => <AddressBookCard />,
  appearance: () => <Appearance />,
  connections: () => <ConnectedSites />,
  notifications: () => <Notifications />,
  phone: () => <Phone />,
  privacy: () => <DeleteAccountCard />,
  profile: () => <Profile />,
  "sign-in": ({ providers }) => <SignIn providers={providers} />,
};

/**
 * Pass → Settings: one row for each section, each opening its own page
 * (`/pass/settings/<section>`). Family (guardians, Duo, kids) has its own
 * page in the Pass.
 */
export const SettingsList = () => {
  const t = useTranslations("app.settings");
  return (
    <>
      <PageHeader title={t("title")} />
      <ul className="flex max-w-2xl flex-col divide-y rounded-lg border bg-card">
        {settingsSections.map((section) => {
          const Icon = ICONS[section];
          const key = sectionKey(section);
          return (
            <li key={section}>
              <Link
                className="flex min-h-14 items-center gap-3 p-4 transition-colors hover:bg-muted/50"
                href={settingsPath(section)}
              >
                <Icon
                  aria-hidden="true"
                  className="size-5 shrink-0 text-pink-text"
                />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="font-medium text-sm">
                    {t(`sections.${key}.title`)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {t(`sections.${key}.description`)}
                  </span>
                </span>
                <ChevronRightIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground rtl:rotate-180"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
};

/** One section of Pass → Settings, on its own page. */
export const SettingsSection = ({
  providers = [],
  section,
}: {
  readonly providers?: SocialProvider[];
  readonly section: SettingsSectionId;
}) => {
  const t = useTranslations("app.settings");
  const Body = SECTION_BODY[section];
  return (
    <>
      <Link
        className="inline-flex min-h-11 items-center gap-1 self-start text-muted-foreground text-sm hover:text-foreground"
        href={settingsPath()}
      >
        <MoveLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t("title")}
      </Link>
      <PageHeader title={t(`sections.${sectionKey(section)}.title`)} />
      <div className="flex max-w-2xl flex-1 flex-col gap-6">
        <p className="text-muted-foreground text-sm">
          {t(`sections.${sectionKey(section)}.description`)}
        </p>
        <Body providers={providers} />
      </div>
    </>
  );
};
