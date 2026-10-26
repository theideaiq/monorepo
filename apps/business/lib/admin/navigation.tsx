import {
  Link as LocaleLink,
  redirect as localeRedirect,
  usePathname as useLocalePathname,
  useRouter as useLocaleRouter,
} from "@repo/internationalization/navigation";
import { type ComponentProps, useMemo } from "react";

/** The back office lives under `/{locale}/staff`. */
export const ADMIN_BASE = "/staff";

type Href = string | { pathname?: string | null };
type RouterHref = Parameters<ReturnType<typeof useLocaleRouter>["push"]>[0];

/**
 * A back-office path ("/orders?status=open") as a path on this site
 * ("/staff/orders?status=open"). Its pages and Server Actions keep
 * writing paths relative to the back office.
 */
export const adminPath = (path: string) => {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return path;
  }
  if (path === "/") {
    return ADMIN_BASE;
  }
  if (path.startsWith("/?") || path.startsWith("/#")) {
    return `${ADMIN_BASE}${path.slice(1)}`;
  }
  return `${ADMIN_BASE}${path}`;
};

const adminHref = <T extends Href>(href: T): T => {
  if (typeof href === "string") {
    return adminPath(href) as T;
  }
  if (href.pathname) {
    return { ...(href as object), pathname: adminPath(href.pathname) } as T;
  }
  return href;
};

/** The current path inside the back office ("/orders", "/" for its home). */
export const stripAdmin = (pathname: string) => {
  if (pathname === ADMIN_BASE) {
    return "/";
  }
  return pathname.startsWith(`${ADMIN_BASE}/`)
    ? pathname.slice(ADMIN_BASE.length)
    : pathname;
};

/** `Link` for back-office paths, with the locale prefix. */
export const Link = ({ href, ...props }: ComponentProps<typeof LocaleLink>) => (
  <LocaleLink href={adminHref(href)} {...props} />
);

/** `redirect` for back-office paths. */
export const redirect = ({
  href,
  locale,
}: Parameters<typeof localeRedirect>[0]): never =>
  localeRedirect({ href: adminHref(href), locale });

/** The back-office path of the current page (without `/admin`). */
export const usePathname = () => stripAdmin(useLocalePathname());

/** The locale-aware router, for back-office paths. */
export const useRouter = () => {
  const router = useLocaleRouter();
  return useMemo(
    () => ({
      ...router,
      push: (href: RouterHref, options?: Parameters<typeof router.push>[1]) =>
        router.push(adminHref(href), options),
      replace: (
        href: RouterHref,
        options?: Parameters<typeof router.replace>[1]
      ) => router.replace(adminHref(href), options),
    }),
    [router]
  );
};
