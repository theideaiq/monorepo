import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/design-system/components/ui/accordion";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale, Messages } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { JsonLd } from "@repo/seo/json-ld";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/page-hero";
import { Section } from "@/components/section";
import { staticPageMetadata } from "@/lib/metadata";

interface FaqProps {
  params: Promise<{ locale: Locale }>;
}

type Groups = Messages["web"]["faq"]["groups"];

export const generateMetadata = staticPageMetadata("faq", "/faq");

const Faq = async ({ params }: FaqProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.faq" });
  const groups = t.raw("groups") as Groups;

  return (
    <>
      <JsonLd
        code={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: groups.flatMap((group) =>
            group.items.map((item) => ({
              "@type": "Question" as const,
              acceptedAnswer: { "@type": "Answer" as const, text: item.answer },
              name: item.question,
            }))
          ),
        }}
      />
      <PageHero subtitle={t("description")} title={t("title")}>
        <Button asChild variant="outline">
          <Link href="/contact">{t("contact")}</Link>
        </Button>
      </PageHero>
      <Section className="max-w-3xl">
        <div className="flex flex-col gap-10">
          {groups.map((group) => (
            <section className="flex flex-col gap-2" key={group.title}>
              <h2 className="font-bold text-xl">{group.title}</h2>
              <Accordion collapsible type="single">
                {group.items.map((item) => (
                  <AccordionItem key={item.question} value={item.question}>
                    <AccordionTrigger className="text-start">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>
      </Section>
    </>
  );
};

export default Faq;
