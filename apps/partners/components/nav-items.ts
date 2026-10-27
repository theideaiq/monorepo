import { BriefcaseBusinessIcon, type LucideIcon } from "lucide-react";

export type NavKey = "business";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  key: NavKey;
}

/** The sections of The IDEA Partners for companies, in sidebar order. */
export const navItems: NavItem[] = [
  { href: "/", icon: BriefcaseBusinessIcon, key: "business" },
];

/** Whether `pathname` is inside the section at `href`. */
export const isActivePath = (pathname: string, href: string) =>
  href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
