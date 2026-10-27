import { project } from "@repo/config";
import { Highlight } from "@repo/design-system/components/brand/highlight";
import type { Locale, Messages } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import {
  Briefcase,
  Building2,
  CircleHelp,
  Headphones,
  Lightbulb,
  MoveRight,
  ShieldCheck,
  Target,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppCta } from "@/components/app-cta";
import { AppPreferences, NativeAppVersion } from "@/components/app-preferences";
import { FeatureGrid } from "@/components/feature-grid";
import { PageHero } from "@/components/page-hero";
import { ProductLines } from "@/components/product-lines";
import { Section } from "@/components/section";
import { SystemStatusBadge } from "@/components/system-status";
import { env } from "@/env";
import { legalDocuments } from "@/lib/legal";
import { telegram } from "@/lib/links";
import { staticPageMetadata } from "@/lib/metadata";
import { APP_VERSION, buildId } from "@/lib/version";

type Values = Messages["web"]["about"]["values"]["items"];
const valueIcons = [Truck, Wallet, ShieldCheck, Headphones];

/** The company's other pages. */
const more = [
  { href: "/help", icon: CircleHelp, id: "help" },
  { href: "/careers", icon: Briefcase, id: "careers" },
  { href: "/partners", icon: Building2, id: "business" },
  { href: "/club", icon: Users, id: "club" },
] as const;

const infoLink = "text-muted-foreground hover:text-foreground";

interface AboutProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = staticPageMetadata("about", "/about");

/**
 * About & info: the company's other pages, language and theme, contact,
 * the legal pages and the version first, then our story.
 */
const About = async ({ params }: AboutProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, web, info, common] = await Promise.all([
    getTranslations({ locale, namespace: "web.about" }),
    getTranslations({ locale, namespace: "web" }),
    getTranslations({ locale, namespace: "web.info" }),
    getTranslations({ locale, namespace: "common" }),
  ]);
  const values = t.raw("values.items") as Values;

  return (
    <>
      <PageHero
        badge={t("badge")}
        highlight={t("highlight")}
        subtitle={t("subtitle")}
        title={t("title")}
      />

      <Section className="grid gap-6 lg:grid-cols-3">
        <nav aria-label={t("more.title")} className="lg:col-span-2">
          <ul className="grid gap-3 sm:grid-cols-2">
            {more.map(({ href, icon: Icon, id }) => (
              <li key={id}>
                <Link
                  className="flex h-full items-center justify-between gap-3 rounded-lg border bg-card p-4 transition-shadow hover:shadow-2"
                  href={href}
                >
                  <span className="flex items-center gap-3 font-medium">
                    <Icon
                      aria-hidden="true"
                      className="size-5 text-pink-text"
                    />
                    {t(`more.${id}`)}
                  </span>
                  <MoveRight
                    aria-hidden="true"
                    className="size-4 text-muted-foreground rtl:rotate-180"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-5 rounded-lg border bg-card p-5 text-sm">
          <div className="flex flex-col gap-2">
            <h2 className="font-semibold">{info("preferences")}</h2>
            <AppPreferences />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold">{info("contact")}</h2>
            <a
              className={infoLink}
              dir="ltr"
              href={`mailto:${project.supportEmail}`}
            >
              {project.supportEmail}
            </a>
            <a
              className={infoLink}
              href={telegram.club}
              rel="noopener noreferrer"
              target="_blank"
            >
              {info("telegram")}
            </a>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold">{info("legal")}</h2>
            {legalDocuments.map(({ slug }) => (
              <Link className={infoLink} href={`/legal/${slug}`} key={slug}>
                {web(`legal.documents.${slug}.title`)}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2 text-muted-foreground">
            <h2 className="font-semibold text-foreground">{info("app")}</h2>
            <p dir="ltr">
              {info("versionLine", { build: buildId(), version: APP_VERSION })}
            </p>
            <NativeAppVersion />
            <SystemStatusBadge
              apiUrl={env.NEXT_PUBLIC_API_URL}
              labels={{
                degraded: common("status.degraded"),
                operational: common("status.operational"),
                partial: common("status.partial"),
                unknown: common("status.unknown"),
              }}
            />
          </div>
        </div>
      </Section>

      <Section>
        <FeatureGrid
          className="lg:grid-cols-3"
          items={[
            {
              description: t("mission.description"),
              icon: Target,
              title: t("mission.title"),
            },
            {
              description: t("vision.description"),
              icon: Lightbulb,
              title: t("vision.title"),
            },
            {
              description: t("company.description"),
              icon: Building2,
              title: t("company.title"),
            },
          ]}
        />
      </Section>
      <section className="container mx-auto px-4 py-14">
        <div className="grid gap-10 rounded-lg border bg-surface-raised p-8 shadow-1 md:grid-cols-2 md:p-12">
          <div className="flex flex-col gap-4">
            <h2 className="font-bold text-3xl tracking-tight md:text-4xl">
              {t("values.title")} <Highlight>{t("values.highlight")}</Highlight>
            </h2>
            <p className="text-lg text-muted-foreground">
              {t("values.description")}
            </p>
          </div>
          <ul className="grid gap-6 sm:grid-cols-2">
            {values.map((value, index) => {
              const Icon = valueIcons[index] ?? ShieldCheck;
              return (
                <li className="flex gap-3" key={value.title}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand text-brand-foreground">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">{value.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {value.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      <Section title={t("linesTitle")}>
        <ProductLines locale={locale} />
      </Section>
      <AppCta locale={locale} />
      <p className="container mx-auto px-4 pb-10 text-muted-foreground text-xs">
        {web("footer.trademarks")}
      </p>
    </>
  );
};

export default About;
