import { project } from "@repo/config";
import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { SystemStatusBadge } from "@/components/system-status";
import { env } from "@/env";
import { legalDocuments } from "@/lib/legal";
import { telegram } from "@/lib/links";
import { navigationGroups } from "@/lib/navigation";

const linkClass =
  "text-muted-foreground text-sm transition-colors hover:text-foreground";

export const Footer = async () => {
  const t = await getTranslations();

  return (
    <footer className="border-t bg-surface-raised">
      {/* On phones the tabs replace these links; About has the same pages. */}
      <div className="container mx-auto hidden gap-10 px-4 py-14 md:grid lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="flex flex-col items-start gap-4">
          <Link aria-label={t("web.nav.home")} href="/">
            <BrandLogo />
          </Link>
          <p className="font-semibold text-lg text-pink-text">
            {t("common.brandLine")}
          </p>
          <p className="max-w-xs text-muted-foreground text-sm leading-relaxed">
            {t("web.footer.tagline")}
          </p>
          <div className="flex flex-col gap-1 text-sm">
            <a
              className={linkClass}
              dir="ltr"
              href={`mailto:${project.supportEmail}`}
            >
              {project.supportEmail}
            </a>
            <a
              className={linkClass}
              href={telegram.club}
              rel="noopener noreferrer"
              target="_blank"
            >
              {t("web.footer.telegram")}
            </a>
          </div>
          <SystemStatusBadge
            apiUrl={env.NEXT_PUBLIC_API_URL}
            labels={{
              degraded: t("common.status.degraded"),
              operational: t("common.status.operational"),
              partial: t("common.status.partial"),
              unknown: t("common.status.unknown"),
            }}
          />
        </div>
        {navigationGroups.map((group) => (
          <nav className="flex flex-col gap-3" key={group.id}>
            <p className="font-medium text-sm">
              {t(`web.nav.groups.${group.id}`)}
            </p>
            {group.items.map((item) => (
              <Link className={linkClass} href={item.href} key={item.id}>
                {t(`web.nav.${item.id}`)}
              </Link>
            ))}
          </nav>
        ))}
        <nav className="flex flex-col gap-3">
          <p className="font-medium text-sm">{t("web.footer.legal")}</p>
          {legalDocuments.map(({ slug }) => (
            <Link className={linkClass} href={`/legal/${slug}`} key={slug}>
              {t(`web.legal.documents.${slug}.title`)}
            </Link>
          ))}
        </nav>
      </div>
      <div className="md:border-t">
        <div className="container mx-auto flex flex-col gap-2 px-4 py-6 text-muted-foreground text-xs">
          <p>
            {t("web.footer.copyright", {
              year: String(new Date().getFullYear()),
            })}
          </p>
          <p>{t("web.footer.trademarks")}</p>
        </div>
      </div>
    </footer>
  );
};
