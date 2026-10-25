/**
 * The site's navigation, shared by the header and the footer. Titles come
 * from `web.nav.<id>`, descriptions from `web.nav.descriptions.<id>`.
 */

type Described = "club" | "events" | "plus" | "post" | "store" | "suite";

export interface NavigationItem {
  described?: Described;
  href: string;
  id: "about" | "careers" | "contact" | "faq" | Described;
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
      { described: "suite", href: "/suite", id: "suite" },
    ],
  },
  {
    id: "community",
    items: [
      { described: "club", href: "/club", id: "club" },
      { described: "post", href: "/post", id: "post" },
      { described: "events", href: "/events", id: "events" },
    ],
  },
  {
    id: "company",
    items: [
      { href: "/about", id: "about" },
      { href: "/about/careers", id: "careers" },
      { href: "/about/faq", id: "faq" },
      { href: "/about/contact", id: "contact" },
    ],
  },
];
