import { Highlight } from "@repo/design-system/components/brand/highlight";
import { PinkBand } from "@repo/design-system/components/brand/pink-band";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale, Messages } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { BookOpen, Globe, Landmark, Plane, Users } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FeatureGrid } from "@/components/feature-grid";
import { PageHero } from "@/components/page-hero";
import { Section } from "@/components/section";
import { staticPageMetadata } from "@/lib/metadata";

interface AcademyProps {
  params: Promise<{ locale: Locale }>;
}

type Programs = Messages["web"]["academy"]["programs"]["items"];
const programIcons = [Plane, Landmark, Users];

export const generateMetadata = staticPageMetadata("academy", "/academy");

const Academy = async ({ params }: AcademyProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web" });
  const programs = t.raw("academy.programs.items") as Programs;

  return (
    <>
      <PageHero
        badge={t("academy.badge")}
        highlight={t("academy.highlight")}
        subtitle={t("academy.subtitle")}
        title={t("academy.title")}
      >
        <Button asChild size="lg">
          <Link href="/contact?topic=academy">{t("academy.cta.button")}</Link>
        </Button>
      </PageHero>

      <Section title={t("academy.tracks.title")}>
        <p className="mb-6 rounded-md border border-brand/40 bg-brand/10 p-4 text-sm">
          {t("academy.status")}
        </p>
        <FeatureGrid
          className="lg:grid-cols-2"
          items={[
            {
              description: t("academy.tracks.learn.description"),
              icon: BookOpen,
              title: t("academy.tracks.learn.title"),
            },
            {
              description: t("academy.tracks.exchange.description"),
              icon: Globe,
              title: t("academy.tracks.exchange.title"),
            },
          ]}
        />
      </Section>

      <Section title={t("academy.programs.title")}>
        <FeatureGrid
          className="lg:grid-cols-3"
          items={programs.map((program, index) => ({
            ...program,
            icon: programIcons[index],
          }))}
        />
        <p className="mt-4 text-muted-foreground text-sm">
          {t("ui.comingSoon")}
        </p>
      </Section>

      <PinkBand
        action={
          <Button asChild size="lg" variant="brand">
            <Link href="/contact?topic=academy">{t("academy.cta.button")}</Link>
          </Button>
        }
        description={t("academy.cta.description")}
        title={<Highlight>{t("academy.cta.title")}</Highlight>}
      />
    </>
  );
};

export default Academy;
