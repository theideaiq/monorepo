import { Highlight } from "@repo/design-system/components/brand/highlight";
import { PinkBand } from "@repo/design-system/components/brand/pink-band";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale, Messages } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { Building2, FileText, PackageSearch, UserSearch } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FeatureGrid } from "@/components/feature-grid";
import { PageHero } from "@/components/page-hero";
import { PlanCard } from "@/components/plan-card";
import { EmptyState, Section } from "@/components/section";
import { env } from "@/env";
import { getPlans } from "@/lib/data";
import { appLink } from "@/lib/links";
import { staticPageMetadata } from "@/lib/metadata";

export const revalidate = 300;

interface BusinessProps {
  params: Promise<{ locale: Locale }>;
}

type Services = Messages["web"]["business"]["services"]["items"];
type Steps = Messages["web"]["business"]["how"]["steps"];
const serviceIcons = [PackageSearch, UserSearch, Building2, FileText];

export const generateMetadata = staticPageMetadata("business", "/business");

const Business = async ({ params }: BusinessProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.business" });
  const plans = await getPlans("business");
  const services = t.raw("services.items") as Services;
  const steps = t.raw("how.steps") as Steps;
  // Companies are created and billed on The IDEA Business.
  const organizationUrl = appLink(env.NEXT_PUBLIC_APP_URL, locale, "/new");

  return (
    <>
      <PageHero badge={t("badge")} subtitle={t("subtitle")} title={t("title")}>
        <Button asChild size="lg">
          <Link
            href={{
              hash: "contact",
              pathname: "/help",
              query: { topic: "business" },
            }}
          >
            {t("cta.contact")}
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href={organizationUrl}>{t("cta.app")}</a>
        </Button>
      </PageHero>

      <Section title={t("services.title")}>
        <FeatureGrid
          items={services.map((service, index) => ({
            ...service,
            icon: serviceIcons[index],
          }))}
        />
      </Section>

      <Section title={t("how.title")}>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <li className="flex gap-3 rounded-lg border p-5" key={step}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-brand-foreground text-sm">
                {formatNumber(index + 1, locale)}
              </span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title={t("plans.title")}>
        {plans.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                href={organizationUrl}
                key={plan.id}
                locale={locale}
                plan={plan}
              />
            ))}
          </div>
        ) : (
          <EmptyState>{t("plans.empty")}</EmptyState>
        )}
      </Section>

      <PinkBand
        action={
          <Button asChild size="lg" variant="brand">
            <Link
              href={{
                hash: "contact",
                pathname: "/help",
                query: { topic: "business" },
              }}
            >
              {t("cta.contact")}
            </Link>
          </Button>
        }
        description={t("cta.description")}
        title={
          <>
            {t("cta.title")} <Highlight>{t("cta.highlight")}</Highlight>
          </>
        }
      />
    </>
  );
};

export default Business;
