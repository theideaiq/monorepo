"use client";

import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { ModeToggle } from "@repo/design-system/components/mode-toggle";
import { Button } from "@repo/design-system/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@repo/design-system/components/ui/navigation-menu";
import { Link } from "@repo/internationalization/navigation";
import { Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { appLink } from "@/lib/links";
import { navigationGroups } from "@/lib/navigation";
import { LanguageSwitcher } from "./language-switcher";

interface HeaderProperties {
  // Passed in by the server layout so the client bundle never imports env.ts.
  readonly appUrl: string;
  /** The IDEA Pass sign-in, coming back to the app. */
  readonly signInUrl: string;
}

export const Header = ({ appUrl, signInUrl }: HeaderProperties) => {
  const t = useTranslations("web.nav");
  const common = useTranslations("common");
  const locale = useLocale();
  const [isOpen, setOpen] = useState(false);
  const themeLabels = {
    dark: common("theme.dark"),
    light: common("theme.light"),
    system: common("theme.system"),
    toggle: common("theme.toggle"),
  };
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container relative mx-auto flex min-h-16 items-center gap-4 px-4">
        <Link aria-label={t("home")} className="shrink-0" href="/">
          <BrandLogo />
        </Link>

        <NavigationMenu className="hidden flex-1 justify-center lg:flex">
          <NavigationMenuList className="gap-1">
            {navigationGroups.map((group) => (
              <NavigationMenuItem key={group.id}>
                <NavigationMenuTrigger className="font-medium text-sm">
                  {t(`groups.${group.id}`)}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[min(36rem,90vw)] gap-1 p-3 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <NavigationMenuLink asChild>
                          <Link
                            className="flex flex-col gap-1 rounded-md p-3 hover:bg-muted"
                            href={item.href}
                          >
                            <span className="font-medium text-sm">
                              {t(item.id)}
                            </span>
                            {item.described ? (
                              <span className="text-muted-foreground text-xs leading-snug">
                                {t(`descriptions.${item.described}`)}
                              </span>
                            ) : null}
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ms-auto flex items-center gap-2">
          <div className="hidden items-center gap-1 md:flex">
            <LanguageSwitcher />
            <ModeToggle labels={themeLabels} />
          </div>
          <Button asChild className="hidden md:inline-flex" variant="ghost">
            <a href={signInUrl}>{t("signIn")}</a>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <a href={appLink(appUrl, locale)}>{t("openApp")}</a>
          </Button>
          <Button
            aria-expanded={isOpen}
            aria-label={isOpen ? common("closeMenu") : common("openMenu")}
            className="lg:hidden"
            onClick={() => setOpen(!isOpen)}
            size="icon"
            variant="ghost"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {isOpen ? (
          <nav className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-b bg-background px-4 py-6 shadow-lg lg:hidden">
            <div className="grid gap-6 sm:grid-cols-3">
              {navigationGroups.map((group) => (
                <div className="flex flex-col gap-2" key={group.id}>
                  <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    {t(`groups.${group.id}`)}
                  </p>
                  {group.items.map((item) => (
                    <Link
                      className="py-1 text-lg"
                      href={item.href}
                      key={item.id}
                      onClick={close}
                    >
                      {t(item.id)}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2 border-t pt-4">
              <LanguageSwitcher />
              <ModeToggle labels={themeLabels} />
              <Button asChild className="ms-auto" variant="outline">
                <a href={signInUrl}>{t("signIn")}</a>
              </Button>
              <Button asChild>
                <a href={appLink(appUrl, locale)}>{t("openApp")}</a>
              </Button>
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  );
};
