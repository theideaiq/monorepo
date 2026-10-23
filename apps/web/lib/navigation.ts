/**
 * The site's navigation, shared by the header and the footer. Titles come
 * from `web.nav.<id>`, descriptions from `web.nav.descriptions.<id>`.
 */

type Described =
  | "academy"
  | "club"
  | "droid"
  | "events"
  | "journal"
  | "news"
  | "plus"
  | "store"
  | "suite";

export interface NavigationItem {
  described?: Described;
  href: string;
  id:
    | "about"
    | "careers"
    | "contact"
    | "faq"
    | Described;
}

export interface NavigationGroup {
  id: "community" | "company" | "ecosystem";
  items: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    id: "ecosystem",
    items: [
      { described: "store", href: "/store", id: "store" },
      { described: "plus", href: "/plus", id: "plus" },
      { described: "academy", href: "/academy", id: "academy" },
      { described: "suite", href: "/suite", id: "suite" },
    ],
  },
  {
    id: "community",
    items: [
      { described: "club", href: "/club", id: "club" },
      { described: "news", href: "/news", id: "news" },
      { described: "events", href: "/events", id: "events" },
      { described: "journal", href: "/journal", id: "journal" },
      { described: "droid", href: "/droid", id: "droid" },
    ],
  },
  {
    id: "company",
    items: [
      { href: "/about", id: "about" },
      { href: "/careers", id: "careers" },
      { href: "/faq", id: "faq" },
      { href: "/contact", id: "contact" },
    ],
  },
];
