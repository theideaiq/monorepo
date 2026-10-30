import { Highlight } from "@repo/design-system/components/brand/highlight";
import { PinkBand } from "@repo/design-system/components/brand/pink-band";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale, Messages } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { BookOpen, Globe, Landmark, Plane, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { FeatureGrid } from "./feature-grid";
import { Section } from "./section";

type Programs = Messages["web"]["club"]["learn"]["programs"]["items"];
const programIcons = [Plane, Landmark, Users];

/**
 * Under the Learn section of The IDEA Club: the two tracks (courses and
 * cultural exchange), the programs being built and a way to register
 * interest (what was the Academy page).
 */
export const LearnPrograms = async ({
  locale,
}: {
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.club.learn" });
  const programs = t.raw("programs.items") as Programs;
  const register = (
    <Button asChild size="lg" variant="brand">
      <Link href={{ hash: "contact", pathname: "/help" }}>
        {t("cta.button")}
      </Link>
    </Button>
  );

  return (
    <>
      <Section title={t("tracks.title")}>
        <p className="mb-6 rounded-md border border-brand/40 bg-brand/10 p-4 text-sm">
          {t("status")}
        </p>
        <FeatureGrid
          className="lg:grid-cols-2"
          items={[
            {
              description: t("tracks.learn.description"),
              icon: BookOpen,
              title: t("tracks.learn.title"),
            },
            {
              description: t("tracks.exchange.description"),
              icon: Globe,
              title: t("tracks.exchange.title"),
            },
          ]}
        />
      </Section>
      <Section title={t("programs.title")}>
        <FeatureGrid
          className="lg:grid-cols-3"
          items={programs.map((program, index) => ({
            ...program,
            icon: programIcons[index],
          }))}
        />
      </Section>
      <PinkBand
        action={register}
        description={t("cta.description")}
        title={<Highlight>{t("cta.title")}</Highlight>}
      />
    </>
  );
};
