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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@repo/design-system/components/ui/sidebar";
import {
  LanguageSwitcher,
  ThemeToggle,
} from "@repo/internationalization/controls";
import {
  BookOpenIcon,
  HandshakeIcon,
  InboxIcon,
  LandmarkIcon,
  LogOutIcon,
  type LucideIcon,
  PackageIcon,
  RepeatIcon,
  ScanLineIcon,
  SettingsIcon,
  ShoppingCartIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { signOut } from "@/lib/admin/auth-actions";
import { Link, usePathname } from "@/lib/admin/navigation";
import { type MenuEntry, type MenuId, sectionHref } from "@/lib/admin/roles";
import { AdminSearch } from "./admin-search";

const icons: Record<MenuId, LucideIcon> = {
  catalog: PackageIcon,
  club: BookOpenIcon,
  counter: ScanLineIcon,
  customers: UsersIcon,
  finance: LandmarkIcon,
  inbox: InboxIcon,
  orders: ShoppingCartIcon,
  partners: HandshakeIcon,
  rentals: RepeatIcon,
  settings: SettingsIcon,
};

interface AppSidebarProps {
  readonly menu: MenuEntry[];
  readonly name: string | null;
  readonly role: StaffRole;
}

/**
 * The console navigation: search, then the menu entries the staff role can
 * use, with their other sections under them.
 */
export const AppSidebar = ({ menu, name, role }: AppSidebarProps) => {
  const t = useTranslations("admin");
  const tAuth = useTranslations("auth");
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  const closeOnMobile = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menu.map((entry) => {
                const [own, ...more] = entry.sections;
                const href = sectionHref[own];
                const subActive = more.some((section) =>
                  isActive(sectionHref[section])
                );
                const Icon = icons[entry.id];
                return (
                  <SidebarMenuItem key={entry.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(href) && !subActive}
                      tooltip={t(`nav.${entry.label}`)}
                    >
                      <Link href={href} onClick={closeOnMobile}>
                        <Icon />
                        <span>{t(`nav.${entry.label}`)}</span>
                      </Link>
                    </SidebarMenuButton>
                    {more.length > 0 ? (
                      <SidebarMenuSub>
                        {more.map((section) => (
                          <SidebarMenuSubItem key={section}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive(sectionHref[section])}
                            >
                              <Link
                                href={sectionHref[section]}
                                onClick={closeOnMobile}
                              >
                                <span>{t(`nav.${section}`)}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    ) : null}
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
