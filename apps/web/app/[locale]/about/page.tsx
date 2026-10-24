import type { Locale } from "@repo/internationalization";
import { Building2, Lightbulb, Target } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppCta } from "@/components/app-cta";
import { FeatureGrid } from "@/components/feature-grid";
import { PageHero } from "@/components/page-hero";
import { ProductLines } from "@/components/product-lines";
import { Section } from "@/components/section";
import { staticPageMetadata } from "@/lib/metadata";

interface AboutProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = staticPageMetadata("about", "/about");

const About = async ({ params }: AboutProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.about" });

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
      <Section title={t("linesTitle")}>
        <ProductLines locale={locale} />
      </Section>
      <AppCta locale={locale} />
    </>
  );
};

export default About;
