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

      <Section>
        <div className="grid items-center gap-8 rounded-2xl bg-[#0f1014] p-8 text-white md:grid-cols-[auto_1fr] md:p-12">
          <span className="flex size-20 items-center justify-center rounded-2xl bg-brand text-brand-foreground">
            <Gamepad2 aria-hidden="true" className="size-10" />
          </span>
          <div className="flex flex-col items-start gap-3">
            <h2 className="font-bold text-3xl text-brand">{t("game.title")}</h2>
            <p className="max-w-2xl text-white/75">{t("game.description")}</p>
            <Button
              asChild
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <a href={SPARK_CATCHER_PATH}>{t("game.play")}</a>
            </Button>
          </div>
        </div>
      </Section>

      <Section>
        <p className="text-muted-foreground text-sm">
          {t("privacy")}{" "}
          <Link className="text-primary underline" href="/legal/privacy">
            {t("privacyLink")}
          </Link>
        </p>
      </Section>
    </>
  );
};

export default Droid;
