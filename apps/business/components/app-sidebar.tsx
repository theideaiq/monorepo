"use client";

import { resetIdentity } from "@repo/analytics/client";
import { UserMenu } from "@repo/auth/components/user-menu";
import { passUrl } from "@repo/auth/pass";
import { useAuth } from "@repo/auth/provider";
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
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/design-system/components/ui/sidebar";
import { localePath } from "@repo/internationalization";
import { Link, usePathname } from "@repo/internationalization/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLinkIcon, IdCardIcon, ShieldIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuthMessages } from "@/lib/auth-messages";
import { useProfile } from "@/lib/queries";
import { LanguageSwitcher } from "./language-switcher";
import { isActivePath, navItems } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

export const AppSidebar = () => {
  const t = useTranslations("app.nav");
  const tMeta = useTranslations("app.meta");
  const locale = useLocale();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { supabase, user } = useAuth();
  const authMessages = useAuthMessages();
  const { isMobile, setOpenMobile } = useSidebar();
  const profile = useProfile();
  // Staff see the back office (RLS: everyone reads only their own row).
  const staff = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (
        await supabase
          .from("staff")
          .select("role")
          .eq("user_id", user?.id ?? "")
          .maybeSingle()
      ).data,
    queryKey: ["staff", user?.id],
  });

  const closeOnMobile = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <Link
          aria-label={tMeta("title")}
          className="flex items-center gap-2 px-2 py-1.5"
          href="/"
          onClick={closeOnMobile}
        >
          <BrandLogo line="Spark" />
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
                  </SidebarMenuItem>
                );
              })}
              {staff.data ? (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={t("backOffice")}>
                    <a href={localePath(locale, "/staff")}>
                      <ShieldIcon />
                      <span>{t("backOffice")}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t("pass")}>
                  <a href={passUrl("/", null, locale)}>
                    <IdCardIcon />
                    <span>{t("pass")}</span>
                    <ExternalLinkIcon className="ms-auto rtl:-scale-x-100" />
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
              window.location.assign(passUrl("/sign-in", null, locale));
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
