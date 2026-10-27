"use client";

import { resetIdentity } from "@repo/analytics/client";
import { OrganizationSwitcher } from "@repo/auth/components/organization-switcher";
import { UserMenu } from "@repo/auth/components/user-menu";
import { passUrl } from "@repo/auth/pass";
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
import {
  LanguageSwitcher,
  ThemeToggle,
} from "@repo/internationalization/controls";
import {
  Link,
  usePathname,
  useRouter,
} from "@repo/internationalization/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLinkIcon, IdCardIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuthMessages } from "@/lib/auth-messages";
import { useProfile } from "@/lib/queries";
import { isActivePath, visibleNavItems } from "./nav-items";
import { useOrganization } from "./organization-provider";

export const AppSidebar = () => {
  const t = useTranslations("app.nav");
  const tMeta = useTranslations("app.meta");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { active, organizations, select } = useOrganization();
  const queryClient = useQueryClient();
  const authMessages = useAuthMessages();
  const { isMobile, setOpenMobile } = useSidebar();
  const profile = useProfile();

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
          <BrandLogo line="Partners" />
        </Link>
        {active ? (
          <OrganizationSwitcher
            activeId={active.id}
            messages={authMessages}
            onCreate={() => {
              closeOnMobile();
              router.push("/new");
            }}
            onSelect={(organizationId) => {
              select(organizationId);
              closeOnMobile();
              router.push("/");
            }}
            organizations={organizations}
          />
        ) : null}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("label")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems(active).map((item) => {
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
