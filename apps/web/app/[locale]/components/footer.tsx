import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { APP_VERSION, buildId } from "@/lib/version";

const linkClass = "transition-colors hover:text-foreground";

const products = [
  { href: "/", id: "store" },
  { href: "/plus", id: "plus" },
  { href: "/club", id: "club" },
  { href: "/pass", id: "pass" },
  { href: "/partners", id: "business" },
] as const;

const company = [
  { href: "/about", id: "about" },
  { href: "/careers", id: "careers" },
  { href: "/help", id: "help" },
  { href: "/legal/terms", id: "legal" },
] as const;

/**
 * Under each page on wider screens: the products (Store, Plus, Club, Pass,
 * Business), then About, Careers, Help and Legal, the copyright and the
 * version. On phones the tabs and the menu cover the same ground.
 */
export const Footer = async () => {
  const t = await getTranslations("web");

  return (
    <footer className="hidden border-t bg-surface-raised md:block">
      <div className="container mx-auto flex flex-col gap-3 px-4 py-5 text-muted-foreground text-xs">
        <nav
          aria-label={t("footer.products")}
          className="flex flex-wrap gap-4 font-medium text-sm"
        >
          {products.map((item) => (
            <Link className={linkClass} href={item.href} key={item.id}>
              {t(`nav.${item.id}`)}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <nav
            aria-label={t("footer.company")}
            className="flex flex-wrap gap-4"
          >
            {company.map((item) => (
              <Link className={linkClass} href={item.href} key={item.id}>
                {t(`nav.${item.id}`)}
              </Link>
            ))}
          </nav>
          <span>
            {t("footer.copyright", { year: String(new Date().getFullYear()) })}
          </span>
          <span className="ms-auto" dir="ltr">
            {t("info.versionLine", { build: buildId(), version: APP_VERSION })}
          </span>
        </div>
      </div>
    </footer>
  );
};
