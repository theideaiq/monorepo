import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { legalDocuments } from "@/lib/legal";
import { APP_VERSION, buildId } from "@/lib/version";

const linkClass = "transition-colors hover:text-foreground";

/**
 * One slim line under each page on wider screens: copyright, the legal
 * pages, contact and the version. On phones the tabs and About & info (in
 * the menu and My Pass) cover the same ground.
 */
export const Footer = async () => {
  const t = await getTranslations("web");

  return (
    <footer className="hidden border-t bg-surface-raised md:block">
      <div className="container mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-5 text-muted-foreground text-xs">
        <span>
          {t("footer.copyright", { year: String(new Date().getFullYear()) })}
        </span>
        <nav aria-label={t("footer.legal")} className="flex flex-wrap gap-4">
          {legalDocuments.map(({ slug }) => (
            <Link className={linkClass} href={`/legal/${slug}`} key={slug}>
              {t(`legal.documents.${slug}.title`)}
            </Link>
          ))}
          <Link className={linkClass} href="/about/contact">
            {t("nav.contact")}
          </Link>
          <Link className={linkClass} href="/about">
            {t("nav.about")}
          </Link>
        </nav>
        <span className="ms-auto" dir="ltr">
          {t("info.versionLine", { build: buildId(), version: APP_VERSION })}
        </span>
      </div>
    </footer>
  );
};
