"use client";

import { resetIdentity } from "@repo/analytics/client";
import { UserMenu } from "@repo/auth/components/user-menu";
import { BrandLogo } from "@repo/design-system/components/brand-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/design-system/components/ui/sidebar";
import { formatNumber } from "@repo/internationalization/format";
import {
  Link,
  usePathname,
  useRouter,
} from "@repo/internationalization/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuthMessages } from "@/lib/auth-messages";
import { useProfile } from "@/lib/queries";
import { useCartCount } from "@/lib/store-queries";
import { LanguageSwitcher } from "./language-switcher";
import { isActivePath, navItems } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

export const AppSidebar = () => {
  const t = useTranslations("app.nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const authMessages = useAuthMessages();
  const { isMobile, setOpenMobile } = useSidebar();
  const profile = useProfile();
  const cartCount = useCartCount();

  const closeOnMobile = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <Link className="px-2 py-1.5" href="/" onClick={closeOnMobile}>
          <BrandLogo />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("label")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const title = t(item.key);
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActivePath(pathname, item.href)}
                      tooltip={title}
                    >
                      <Link href={item.href} onClick={closeOnMobile}>
                        <item.icon />
                        <span>{title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.key === "cart" && cartCount > 0 ? (
                      <SidebarMenuBadge
                        aria-label={t("cartCount", {
                          count: formatNumber(cartCount, locale),
                        })}
                      >
                        {formatNumber(cartCount, locale)}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between gap-1">
          <UserMenu
            messages={authMessages}
            name={profile.data?.full_name}
            onSignedOut={() => {
              queryClient.clear();
              resetIdentity();
              router.replace("/sign-in");
            }}
          />
          <div className="flex shrink-0 items-center">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
