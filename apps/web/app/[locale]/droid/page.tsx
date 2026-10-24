import { Highlight } from "@repo/design-system/components/brand/highlight";
import { PinkBand } from "@repo/design-system/components/brand/pink-band";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale, Messages } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import {
  Bot,
  Gamepad2,
  LifeBuoy,
  MessageCircleQuestion,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FeatureGrid } from "@/components/feature-grid";
import { PageHero } from "@/components/page-hero";
import { Section } from "@/components/section";
import { SPARK_CATCHER_PATH, telegram } from "@/lib/links";
import { staticPageMetadata } from "@/lib/metadata";

interface DroidProps {
  params: Promise<{ locale: Locale }>;
}

type Features = Messages["web"]["droid"]["features"]["items"];
const featureIcons = [
  ShieldCheck,
  MessageCircleQuestion,
  Search,
  Bot,
  LifeBuoy,
];

export const generateMetadata = staticPageMetadata("droid", "/droid");

const Droid = async ({ params }: DroidProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.droid" });
  const features = t.raw("features.items") as Features;

  return (
    <>
      <PageHero badge={t("badge")} subtitle={t("subtitle")} title={t("title")}>
        <Button asChild className="gap-2" size="lg">
          <a href={telegram.bot} rel="noopener noreferrer" target="_blank">
            <Send className="size-4" />
            {t("open")}
          </a>
        </Button>
      </PageHero>

      <Section title={t("features.title")}>
        <FeatureGrid
          className="lg:grid-cols-3"
          items={features.map((feature, index) => ({
            ...feature,
            icon: featureIcons[index],
          }))}
        />
      </Section>

      <PinkBand
        action={
          <Button asChild className="gap-2" size="lg" variant="brand">
            <a href={SPARK_CATCHER_PATH}>
              <Gamepad2 aria-hidden="true" />
              {t("game.play")}
            </a>
          </Button>
        }
        description={t("game.description")}
        title={<Highlight>{t("game.title")}</Highlight>}
      />

      <Section>
        <p className="text-muted-foreground text-sm">
          {t("privacy")}{" "}
          <Link className="text-pink-text underline" href="/legal/privacy">
            {t("privacyLink")}
          </Link>
        </p>
      </Section>
    </>
  );
};

export default Droid;
