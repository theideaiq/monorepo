/**
 * Navigation inside Staff. Its pages sit at the root of the app
 * (staff.theideaiq.com/orders), so its paths are the locale-aware ones as
 * written ("/orders?status=open").
 */
export {
  Link,
  redirect,
  usePathname,
  useRouter,
} from "@repo/internationalization/navigation";
