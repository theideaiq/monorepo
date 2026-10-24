import { project } from "@repo/config";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale, Messages } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Check, Mail } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/page-hero";
import { Section } from "@/components/section";
import { staticPageMetadata } from "@/lib/metadata";

interface CareersProps {
  params: Promise<{ locale: Locale }>;
}

type Steps = Messages["web"]["careers"]["apply"]["steps"];
type Areas = Messages["web"]["careers"]["areas"]["items"];

export const generateMetadata = staticPageMetadata("careers", "/careers");

const Careers = async ({ params }: CareersProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.careers" });
  const email = project.supportEmail ?? "hi@theideaiq.com";
  const steps = (t.raw("apply.steps") as Steps).map((step) =>
    step.replace("{email}", email)
  );
  const areas = t.raw("areas.items") as Areas;
  const mailto = `mailto:${email}?subject=${encodeURIComponent("Application")}`;

  return (
    <>
      <PageHero subtitle={t("subtitle")} title={t("title")}>
        <Button asChild className="gap-2" size="lg">
          <a href={mailto}>
            <Mail className="size-4" />
            {t("apply.button")}
          </a>
        </Button>
      </PageHero>

      <Section title={t("openings.title")}>
        <p className="max-w-3xl rounded-lg border border-dashed p-6 text-muted-foreground">
          {t("openings.description")}
        </p>
      </Section>

      <div className="container mx-auto grid gap-10 px-4 pb-14 lg:grid-cols-2">
        <section className="flex flex-col gap-4">
          <h2 className="font-bold text-2xl">{t("apply.title")}</h2>
          <ol className="flex flex-col gap-3">
            {steps.map((step, index) => (
              <li className="flex gap-3" key={step}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-brand-foreground text-sm">
                  {formatNumber(index + 1, locale)}
                </span>
                <p className="leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="flex flex-col gap-4">
          <h2 className="font-bold text-2xl">{t("areas.title")}</h2>
          <ul className="flex flex-col gap-2">
            {areas.map((area) => (
              <li className="flex gap-2" key={area}>
                <Check
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0 text-pink-text"
                />
                {area}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
};

export default Careers;
