"use client";

import { ModeToggle } from "@repo/design-system/components/mode-toggle";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/app/[locale]/components/header/language-switcher";
import { isNativeApp } from "@/lib/platform";

/** Language and theme, as in the header. */
export const AppPreferences = () => {
  const common = useTranslations("common");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <LanguageSwitcher />
      <ModeToggle
        labels={{
          dark: common("theme.dark"),
          light: common("theme.light"),
          system: common("theme.system"),
          toggle: common("theme.toggle"),
        }}
      />
    </div>
  );
};

/** Inside the iOS/Android apps, the installed app's version (none on the web). */
export const NativeAppVersion = () => {
  const t = useTranslations("web.info");
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!isNativeApp()) {
      return;
    }
    import("@capacitor/app")
      .then(({ App }) => App.getInfo())
      .then((info) => setVersion(`${info.version} (${info.build})`))
      .catch(() => setVersion(null));
  }, []);

  return version ? <p dir="ltr">{t("appVersion", { version })}</p> : null;
};
