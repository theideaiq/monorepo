"use client";

import { useAuth } from "@repo/auth/provider";
import type { StaffRole } from "@repo/database";
import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/design-system/components/ui/sidebar";
import {
  BookOpenIcon,
  HandCoinsIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  LogOutIcon,
  type LucideIcon,
  PackageIcon,
  RepeatIcon,
  ScrollTextIcon,
  SendIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  StarIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/lib/admin/auth-actions";
import { Link, usePathname } from "@/lib/admin/navigation";
import { type Section, sectionHref } from "@/lib/admin/roles";
import { unregisterPushNotifications } from "@/lib/native/push";

const icons: Record<Section, LucideIcon> = {
  audit: ScrollTextIcon,
  catalog: PackageIcon,
  customers: UsersIcon,
  dashboard: LayoutDashboardIcon,
  editorial: BookOpenIcon,
  finance: LandmarkIcon,
  orders: ShoppingCartIcon,
  rentals: RepeatIcon,
  reviews: StarIcon,
  staff: ShieldCheckIcon,
  support: LifeBuoyIcon,
  telegram: SendIcon,
  tradeIns: HandCoinsIcon,
};

interface AppSidebarProps {
  readonly name: string | null;
  readonly role: StaffRole;
  readonly sections: Section[];
}

/** The console navigation: only the sections the staff role can use. */
export const AppSidebar = ({ name, role, sections }: AppSidebarProps) => {
  const t = useTranslations("admin");
  const tAuth = useTranslations("auth");
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { supabase } = useAuth();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <Link className="flex items-center gap-2 px-2 py-1.5" href="/">
          <BrandLogo line="Staff" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sections.map((section) => {
                const Icon = icons[section];
                const href = sectionHref[section];
                return (
                  <SidebarMenuItem key={section}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(href)}
                      tooltip={t(`nav.${section}`)}
                    >
                      <Link
                        href={href}
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
                        <Icon />
                        <span>{t(`nav.${section}`)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="grid gap-2 rounded-md border bg-background/60 p-2">
          <div className="grid min-w-0 gap-0.5 px-1">
            <span className="truncate font-medium text-sm">
              {name ?? t("staff.unnamed")}
            </span>
            <span className="text-muted-foreground text-xs">
              {t(`roles.${role}`)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <form
              action={async () => {
                await unregisterPushNotifications(supabase);
                await signOut();
              }}
            >
              <Button size="sm" type="submit" variant="ghost">
                <LogOutIcon className="rtl:rotate-180" />
                {tAuth("signOut")}
              </Button>
            </form>
            <span className="flex items-center">
              <LanguageSwitcher />
              <ThemeToggle />
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
