"use client";

import { ModeToggle } from "@repo/design-system/components/mode-toggle";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getLocaleLabel, type Locale, locales } from "./config";
import { usePathname, useRouter } from "./navigation";

/**
 * The language and theme switches Partners and Staff share. Their
 * texts come from the `common` messages.
 */

const STORAGE_KEY = "locale";

/** Remembers the language the user picked on this device. */
const rememberLocale = (locale: Locale) => {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage can be unavailable (private mode); the URL still carries it.
  }
};

/** Switches the app language and remembers the choice on this device. */
export const LanguageSwitcher = () => {
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const current = useLocale();

  const switchTo = (locale: Locale) => {
    rememberLocale(locale);
    router.replace(`${pathname}${window.location.search}`, { locale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="shrink-0" size="icon" variant="ghost">
          <Languages className="size-4" />
          <span className="sr-only">{t("switchLanguage")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {locales.map((locale) => (
          <DropdownMenuItem
            disabled={locale === current}
            key={locale}
            lang={locale}
            onClick={() => switchTo(locale)}
          >
            {getLocaleLabel(locale)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/** Light, dark or the system's theme. */
export const ThemeToggle = () => {
  const t = useTranslations("common.theme");

  return (
    <ModeToggle
      labels={{
        dark: t("dark"),
        light: t("light"),
        system: t("system"),
        toggle: t("toggle"),
      }}
    />
  );
};
