import {
  LanguageSwitcher,
  ThemeToggle,
} from "@repo/internationalization/controls";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { telegram } from "@/lib/links";
import { APP_VERSION, buildId } from "@/lib/version";

const linkClass = "transition-colors hover:text-foreground";

const links = [
  { href: "/partners", id: "business" },
  { href: "/about", id: "about" },
  { href: "/careers", id: "careers" },
  { href: "/help", id: "help" },
  { href: "/legal/terms", id: "legal" },
] as const;

/**
 * Under every page on wider screens of the website: what the top bar
 * doesn't carry (For partners, About, Careers, Help, Legal), the language
 * and theme, our social links, the copyright and the version. Phones and
 * the apps have no footer: My Pass ends with "About & help" (/about, which
 * holds all of this) and Pass → Settings has the language and theme.
 */
export const Footer = async () => {
  const t = await getTranslations("web");

  return (
    <footer className="hidden border-t bg-surface-raised md:block">
      <div className="container mx-auto flex flex-col gap-3 px-4 py-5 text-muted-foreground text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <nav
            aria-label={t("footer.company")}
            className="flex flex-wrap gap-4 font-medium text-sm"
          >
            {links.map((item) => (
              <Link className={linkClass} href={item.href} key={item.id}>
                {t(`nav.${item.id}`)}
              </Link>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a
            className={linkClass}
            href={telegram.club}
            rel="noopener noreferrer"
            target="_blank"
          >
            {t("footer.telegram")}
          </a>
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
