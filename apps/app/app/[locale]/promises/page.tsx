import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { MoveRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/page-hero";
import { promises } from "@/components/promises";
import { Section } from "@/components/section";
import { staticPageMetadata } from "@/lib/metadata";

interface PromisesProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = staticPageMetadata("promises", "/promises");

/** Where to claim each promise when it isn't kept. */
const claims = {
  condition: "/pass/orders",
  leave: "/plus/plan",
  price: "/help/new",
  when: "/pass/orders",
} as const;

/**
 * The promises page: each promise, what it means in the policy behind it,
 * and how to claim it when it isn't kept, with a person to ask last.
 */
const PromisesPage = async ({ params }: PromisesProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.promises" });

  return (
    <>
      <PageHero
        highlight={t("page.highlight")}
        subtitle={t("page.subtitle")}
        title={t("page.title")}
      />
      <Section>
        <ol className="grid gap-4 md:grid-cols-2">
          {promises.map(({ href, icon: Icon, id }) => (
            <li
              className="flex flex-col gap-3 rounded-lg border bg-card p-5"
              key={id}
            >
              <h2 className="flex items-center gap-3 font-semibold text-lg">
                <Icon aria-hidden="true" className="size-5 text-pink-text" />
                {t(`items.${id}.title`)}
              </h2>
              <p className="text-muted-foreground">{t(`items.${id}.means`)}</p>
              <p className="text-sm">
                <span className="font-medium">{t("page.ifNot")}</span>{" "}
                {t(`items.${id}.claim`)}
              </p>
              <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <Link
                  className="inline-flex min-h-11 items-center gap-2 font-medium text-pink-text hover:underline"
                  href={claims[id]}
                >
                  {t(`items.${id}.claimAction`)}
                  <MoveRight
                    aria-hidden="true"
                    className="size-4 rtl:rotate-180"
                  />
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground hover:underline"
                  href={href}
                >
                  {t(`items.${id}.policy`)}
                </Link>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-muted-foreground text-sm">
          {t("page.stuck")}{" "}
          <Link
            className="font-medium text-pink-text hover:underline"
            href="/help#contact"
          >
            {t("page.contact")}
          </Link>
        </p>
      </Section>
    </>
  );
};

export default PromisesPage;
