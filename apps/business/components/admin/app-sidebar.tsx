"use client";

import type { StaffRole } from "@repo/database";
import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { Button } from "@repo/design-system/components/ui/button";
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
  BookOpenIcon,
  BriefcaseBusinessIcon,
  HandCoinsIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  LogOutIcon,
  type LucideIcon,
  MegaphoneIcon,
  PackageIcon,
  RepeatIcon,
  ScanLineIcon,
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
import {
  type Section,
  type SectionGroup,
  sectionHref,
} from "@/lib/admin/roles";
import { AdminSearch } from "./admin-search";

const icons: Record<Section, LucideIcon> = {
  affiliates: MegaphoneIcon,
  audit: ScrollTextIcon,
  catalog: PackageIcon,
  counter: ScanLineIcon,
  customers: UsersIcon,
  dashboard: LayoutDashboardIcon,
  editorial: BookOpenIcon,
  finance: LandmarkIcon,
  orders: ShoppingCartIcon,
  rentals: RepeatIcon,
  reviews: StarIcon,
  staff: ShieldCheckIcon,
  suite: BriefcaseBusinessIcon,
  support: LifeBuoyIcon,
  telegram: SendIcon,
  tradeIns: HandCoinsIcon,
};

interface AppSidebarProps {
  readonly groups: { id: SectionGroup; sections: Section[] }[];
  readonly name: string | null;
  readonly role: StaffRole;
}

/**
 * The console navigation: search, then the sections the staff role can
 * use, in groups.
 */
export const AppSidebar = ({ groups, name, role }: AppSidebarProps) => {
  const t = useTranslations("admin");
  const tAuth = useTranslations("auth");
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

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
        <div className="px-2 pt-1">
          <AdminSearch
            onSearch={() => {
              if (isMobile) {
                setOpenMobile(false);
              }
            }}
          />
        </div>
        {groups.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel>{t(`navGroups.${group.id}`)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.sections.map((section) => {
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
        ))}
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
            <form action={signOut}>
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
