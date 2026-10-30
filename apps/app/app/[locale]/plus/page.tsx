import { formatPrice, localized, planName } from "@repo/commerce";
import { Highlight } from "@repo/design-system/components/brand/highlight";
import { PinkBand } from "@repo/design-system/components/brand/pink-band";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale, Messages } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { MoveRight } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlanCard } from "@/components/plan-card";
import { PlusSurface } from "@/components/plus/plus-surface";
import {
  HouseholdSlots,
  PlusHomeSwitch,
  QueueRow,
  VisitorOnly,
} from "@/components/screens/plus";
import { Section } from "@/components/section";
import { CategoryChips } from "@/components/shop/category-chips";
import { Rail } from "@/components/shop/rail";
import { CoverCard } from "@/components/store/cover-card";
import {
  getCategories,
  getKitTypes,
  getPlans,
  getPlusAvailability,
  getProducts,
  getRentalTiers,
} from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import { requiredPlan, soloPlans } from "@/lib/plus";

export const revalidate = 300;

const ROW = 8;

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

/**
 * The IDEA Plus, darker and cover-led. A member opens on the household's
 * slots (At home 2 of 2, what's next, Send one back); a visitor on the
 * pitch and how it works in three steps. Then the category chips and the
 * rows (New to Plus, Your queue, one per category) with availability on
 * every cover, the three plan cards for visitors, and the game night
 * kits. Plans and joining are at /plus/plans, your plan at /plus/plan.
 */
const PlusPage = async ({ params }: PlusProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web" });

  const [categories, allPlans, kits, fresh] = await Promise.all([
    getCategories("rental"),
    getPlans("plus"),
    getKitTypes(),
    getProducts({ kind: "rental", limit: ROW, sort: "newest" }),
  ]);
  const topLevel = categories.filter((category) => !category.parent_id);
  const perCategory = await Promise.all(
    topLevel.map(async (category) => ({
      category,
      products: await getProducts({
        category: category.slug,
        kind: "rental",
        limit: ROW,
      }),
    }))
  );
  const ids = [
    ...fresh.map((product) => product.id),
    ...perCategory.flatMap((row) => row.products.map((product) => product.id)),
  ];
  const [availability, tiers] = await Promise.all([
    getPlusAvailability(ids),
    getRentalTiers(ids),
  ]);
  const plans = soloPlans(allPlans).filter(
    (plan) => plan.billing_interval === "month"
  );
  const steps = t.raw("plus.how.steps") as Steps;
  const cover = (product: (typeof fresh)[number]) => {
    const plan = requiredPlan(plans, tiers[product.id]);
    return (
      <CoverCard
        availability={availability[product.id] ?? null}
        key={product.id}
        needsPlan={plan ? planName(plan, locale) : null}
        plus
        product={product}
      />
    );
  };

  const pitch = (
    <>
      <PinkBand
        action={
          <Button asChild className="gap-2" size="lg" variant="brand">
            <Link href="/plus/plans">
              {t("plus.cta")}
              <MoveRight className="size-4 rtl:rotate-180" />
            </Link>
          </Button>
        }
        description={t("plus.subtitle")}
        title={
          <>
            {t("plus.title")} <Highlight>{t("plus.highlight")}</Highlight>
          </>
        }
        titleAs="h1"
      />
      <Section className="py-10" title={t("plus.how.title")}>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <li
              className="flex flex-col gap-2 rounded-2xl border bg-card p-5"
              key={step.title}
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-brand font-bold text-brand-foreground">
                {formatNumber(index + 1, locale)}
              </span>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-muted-foreground text-sm">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );

  return (
    <PlusSurface>
      <PlusHomeSwitch
        member={
          <div className="container mx-auto grid gap-4 px-4 pt-6">
            <h1 className="sr-only">{t("plus.homeTitle")}</h1>
            <HouseholdSlots />
          </div>
        }
        visitor={pitch}
      />

      <div className="container mx-auto px-4 pt-6">
        <CategoryChips
          categories={categories}
          hrefFor={(slug) => `/plus/${encodeURIComponent(slug)}`}
          label={t("store.categories")}
          locale={locale}
        />
      </div>

      {fresh.length > 0 ? (
        <Rail title={t("plus.rows.new")}>{fresh.map(cover)}</Rail>
      ) : null}
      <QueueRow />
      {perCategory.map(({ category, products }) =>
        products.length > 0 ? (
          <Rail
            action={{
              href: `/plus/${category.slug}`,
              label: t("store.shelf.seeAll"),
            }}
            key={category.id}
            title={localized(category, "name", locale)}
          >
            {products.map(cover)}
          </Rail>
        ) : null
      )}

      <VisitorOnly>
        <Section
          description={t("plus.plans.description")}
          id="plans"
          title={t("plus.plans.title")}
        >
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan, index) => (
              <PlanCard
                featured={plans.length >= 3 && index === 1}
                href="/plus/plans"
                key={plan.id}
                locale={locale}
                plan={plan}
              />
            ))}
          </div>
        </Section>
      </VisitorOnly>

      {kits.length > 0 ? (
        <Section
          description={t("plus.kits.description")}
          id="kits"
          title={t("plus.kits.title")}
        >
          <ul className="grid gap-4 md:grid-cols-3">
            {kits.map((kit) => (
              <li
                className="flex flex-col gap-3 rounded-2xl border bg-card p-5"
                key={kit.id}
              >
                <h3 className="font-semibold">
                  {localized(kit, "name", locale)}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {localized(kit, "description", locale)}
                </p>
                <p className="font-medium text-sm">
                  {t("plus.kits.price", {
                    extra: formatPrice(kit.extra_day_price, locale),
                    price: formatPrice(kit.price, locale),
                  })}
                </p>
                <Button
                  asChild
                  className="mt-auto self-start"
                  variant="outline"
                >
                  <Link href={`/store/kits/${kit.id}`}>
                    {t("plus.kits.book")}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </PlusSurface>
  );
};

export default PlusPage;
