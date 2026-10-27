/**
 * Navigation inside Staff. Staff answers at the root of its own host
 * (staff.theideaiq.com/orders; `proxy.ts` maps it to `app/[locale]/staff`),
 * so its paths are the locale-aware ones as written ("/orders?status=open").
 */
export {
  Link,
  redirect,
  usePathname,
  useRouter,
} from "@repo/internationalization/navigation";
