import { Button } from "@repo/design-system/components/ui/button";
import type { Locale, Messages } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { MoveRight } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/page-hero";
import { PlanCard } from "@/components/plan-card";
import { ProductCard } from "@/components/product-card";
import { EmptyState, Section } from "@/components/section";
import { env } from "@/env";
import { getPlans, getProducts } from "@/lib/data";
import { appLink } from "@/lib/links";
import { localizedMetadata } from "@/lib/metadata";

export const revalidate = 300;

interface PlusProps {
  params: Promise<{ locale: Locale }>;
}

type Steps = Messages["web"]["plus"]["how"]["steps"];

export const generateMetadata = async ({
  params,
}: PlusProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.plus.meta" });
  return localizedMetadata(locale, "/plus", {
    description: t("description"),
    title: t("title"),
  });
};

const Plus = async ({ params }: PlusProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.plus" });
  const [plans, rentals] = await Promise.all([
    getPlans("plus"),
    getProducts({ kind: "rental", limit: 8 }),
  ]);
  const steps = t.raw("how.steps") as Steps;
  const plusUrl = appLink(env.NEXT_PUBLIC_APP_URL, locale, "/plus");

  return (
    <>
      <PageHero
        badge={t("badge")}
        highlight={t("highlight")}
        subtitle={t("subtitle")}
        title={t("title")}
      >
        <Button asChild className="gap-2" size="lg">
          <a href={plusUrl}>
            {t("cta")} <MoveRight className="size-4 rtl:rotate-180" />
          </a>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href="#plans">{t("seePlans")}</a>
        </Button>
      </PageHero>

      <Section title={t("how.title")}>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li className="flex flex-col gap-2 rounded-xl border p-5" key={step.title}>
              <span className="flex size-9 items-center justify-center rounded-full bg-brand font-bold text-brand-foreground">
                {formatNumber(index + 1, locale)}
              </span>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-muted-foreground text-sm">{step.description}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        description={t("plans.description")}
        id="plans"
        title={t("plans.title")}
      >
        {plans.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                href={appLink(env.NEXT_PUBLIC_APP_URL, locale, "/plus", {
                  plan: plan.id,
                })}
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

      <Section
        description={t("catalog.description")}
        title={t("catalog.title")}
      >
        {rentals.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {rentals.map((product) => (
                <ProductCard key={product.id} locale={locale} product={product} />
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Button asChild variant="outline">
                <a href={plusUrl}>{t("catalog.browse")}</a>
              </Button>
            </div>
          </>
        ) : (
          <EmptyState>{t("catalog.empty")}</EmptyState>
        )}
      </Section>
    </>
  );
};

export default Plus;
