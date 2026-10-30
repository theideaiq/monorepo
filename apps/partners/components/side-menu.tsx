"use client";

import type { OrganizationFeature } from "@repo/auth/organizations";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@repo/design-system/components/ui/sidebar";
import { formatNumber } from "@repo/internationalization/format";
import { Link, usePathname } from "@repo/internationalization/navigation";
import { type LucideIcon, StoreIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSeller } from "@/lib/seller-queries";
import { useActionCounts } from "@/lib/today-queries";
import {
  ADD_SECTIONS_HREF,
  APPLY_HREF,
  type CountKey,
  isActivePath,
  type MenuEntry,
  menuFor,
  type NavItem,
} from "./nav-items";
import { useOrganization } from "./organization-provider";

type Counts = Record<CountKey, number> | null;

const PageEntry = ({
  counts,
  item,
  onNavigate,
}: {
  readonly counts: Counts;
  readonly item: NavItem;
  readonly onNavigate: () => void;
}) => {
  const t = useTranslations("app.nav");
  const locale = useLocale();
  const pathname = usePathname();
  const title = t(item.key);
  const count = item.count && counts ? counts[item.count] : 0;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActivePath(pathname, item.href)}
        tooltip={title}
      >
        <Link href={item.href} onClick={onNavigate}>
          <item.icon />
          <span>{title}</span>
        </Link>
      </SidebarMenuButton>
      {count > 0 ? (
        <SidebarMenuBadge className="bg-idea-pink text-on-pink peer-data-[active=true]/menu-button:text-on-pink">
          {formatNumber(count, locale)}
          <span className="sr-only"> {t("toDo")}</span>
        </SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  );
};

/** A section not switched on: greyed, with "Add" to where it's added. */
const AddEntry = ({
  feature,
  icon: Icon,
  onNavigate,
}: {
  readonly feature: OrganizationFeature;
  readonly icon: LucideIcon;
  readonly onNavigate: () => void;
}) => {
  const t = useTranslations("app.nav");
  const title = t(feature);
  return (
    <SidebarMenuItem>
      <div className="flex h-8 items-center gap-2 rounded-md p-2 text-sm">
        <Icon aria-hidden="true" className="size-4 shrink-0 opacity-50" />
        <span className="truncate text-muted-foreground">{title}</span>
        <Link
          aria-label={t("addSection", { section: title })}
          className="ms-auto rounded-full border px-2 py-0.5 font-medium text-xs outline-hidden ring-sidebar-ring hover:bg-sidebar-accent focus-visible:ring-2"
          href={ADD_SECTIONS_HREF}
          onClick={onNavigate}
        >
          {t("add")}
        </Link>
      </div>
    </SidebarMenuItem>
  );
};

const ApplyEntry = ({ onNavigate }: { readonly onNavigate: () => void }) => {
  const t = useTranslations("app.nav");
  const pathname = usePathname();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActivePath(pathname, APPLY_HREF)}
        tooltip={t("applyToSell")}
      >
        <Link href={APPLY_HREF} onClick={onNavigate}>
          <StoreIcon />
          <span>{t("applyToSell")}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const Entry = ({
  counts,
  entry,
  onNavigate,
}: {
  readonly counts: Counts;
  readonly entry: MenuEntry;
  readonly onNavigate: () => void;
}) => {
  if (entry.kind === "link") {
    return (
      <PageEntry counts={counts} item={entry.item} onNavigate={onNavigate} />
    );
  }
  if (entry.kind === "add") {
    return (
      <AddEntry
        feature={entry.feature}
        icon={entry.icon}
        onNavigate={onNavigate}
      />
    );
  }
  return <ApplyEntry onNavigate={onNavigate} />;
};

/**
 * The side menu: Today; Sell; Grow; Organization. Sections not switched on
 * stay greyed with "Add"; counts show only where something needs action.
 */
export const SideMenu = ({
  onNavigate,
}: {
  readonly onNavigate: () => void;
}) => {
  const t = useTranslations("app.nav");
  const { active } = useOrganization();
  const selling = Boolean(active?.features.includes("selling"));
  const shop = useSeller(active?.id ?? "", selling);
  const approved = shop.data?.seller.status === "approved";
  const counts = useActionCounts(approved ? (shop.data?.seller.id ?? "") : "");
  const loadingShop = selling && shop.isPending;

  return (
    <>
      {menuFor(active, approved).map((group) => (
        <SidebarGroup key={group.key}>
          {group.key === "today" ? null : (
            <SidebarGroupLabel>{t(group.key)}</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.key === "sell" && loadingShop ? (
                <SidebarMenuItem>
                  <SidebarMenuSkeleton showIcon />
                </SidebarMenuItem>
              ) : (
                group.entries.map((entry) => (
                  <Entry
                    counts={counts}
                    entry={entry}
                    key={
                      entry.kind === "link"
                        ? entry.item.key
                        : `${entry.kind}-${"feature" in entry ? entry.feature : ""}`
                    }
                    onNavigate={onNavigate}
                  />
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
};
