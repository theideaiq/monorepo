import { Highlight } from "@repo/design-system/components/brand/highlight";
import type { Locale, Messages } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import {
  Briefcase,
  Building2,
  CircleHelp,
  Headphones,
  Lightbulb,
  Mail,
  MoveRight,
  Scale,
  ShieldCheck,
  Target,
  Truck,
  Wallet,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppCta } from "@/components/app-cta";
import { FeatureGrid } from "@/components/feature-grid";
import { PageHero } from "@/components/page-hero";
import { ProductLines } from "@/components/product-lines";
import { Section } from "@/components/section";
import { staticPageMetadata } from "@/lib/metadata";

type Values = Messages["web"]["about"]["values"]["items"];
const valueIcons = [Truck, Wallet, ShieldCheck, Headphones];

/** The rest of the company's pages. */
const more = [
  { href: "/suite", icon: Building2, id: "suite" },
  { href: "/about/careers", icon: Briefcase, id: "careers" },
  { href: "/about/faq", icon: CircleHelp, id: "faq" },
  { href: "/about/contact", icon: Mail, id: "contact" },
  { href: "/legal/terms", icon: Scale, id: "legal" },
] as const;

interface AboutProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = staticPageMetadata("about", "/about");

const About = async ({ params }: AboutProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.about" });
  const values = t.raw("values.items") as Values;

  return (
    <>
      <PageHero
        badge={t("badge")}
        highlight={t("highlight")}
        subtitle={t("subtitle")}
        title={t("title")}
      />
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
      <Section title={t("more.title")}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {more.map(({ href, icon: Icon, id }) => (
            <li key={id}>
              <Link
                className="flex h-full items-center justify-between gap-3 rounded-lg border bg-card p-4 transition-shadow hover:shadow-2"
                href={href}
              >
                <span className="flex items-center gap-3 font-medium">
                  <Icon aria-hidden="true" className="size-5 text-pink-text" />
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
      </Section>
      <AppCta locale={locale} />
    </>
  );
};

export default About;
