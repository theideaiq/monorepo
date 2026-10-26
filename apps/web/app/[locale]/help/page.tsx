import { project } from "@repo/config";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/design-system/components/ui/accordion";
import type { Locale, Messages } from "@repo/internationalization";
import { JsonLd } from "@repo/seo/json-ld";
import { Bot, Mail, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { PageHero } from "@/components/page-hero";
import { Support } from "@/components/screens/support";
import { Section } from "@/components/section";
import { env } from "@/env";
import { telegram } from "@/lib/links";
import { localizedMetadata } from "@/lib/metadata";
import { ContactForm } from "./components/contact-form";

interface HelpProps {
  params: Promise<{ locale: Locale }>;
}

type Groups = Messages["web"]["faq"]["groups"];

export const generateMetadata = async ({
  params,
}: HelpProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.help.meta" });
  return localizedMetadata(locale, "/help", {
    description: t("description"),
    title: t("title"),
  });
};

/**
 * /help: the member's support tickets, the FAQ, Ask Droid on Telegram and
 * the contact form, on one page.
 */
const Help = async ({ params }: HelpProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, faq, contact] = await Promise.all([
    getTranslations({ locale, namespace: "web.help" }),
    getTranslations({ locale, namespace: "web.faq" }),
    getTranslations({ locale, namespace: "web.contact" }),
  ]);
  const groups = faq.raw("groups") as Groups;

  const details = [
    {
      href: telegram.bot,
      icon: Bot,
      label: t("droid.title"),
      ltr: true,
      note: t("droid.description"),
      value: telegram.botHandle,
    },
    {
      href: `mailto:${project.supportEmail}`,
      icon: Mail,
      label: contact("details.email"),
      ltr: true,
      note: contact("details.emailNote"),
      value: project.supportEmail,
    },
    {
      icon: MapPin,
      label: contact("details.location"),
      ltr: false,
      note: undefined,
      value: contact("details.address"),
    },
  ];

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
      <PageHero subtitle={t("description")} title={t("title")} />
      <Section className="flex max-w-3xl flex-col gap-12">
        <Support />

        <section className="flex flex-col gap-6">
          <h2 className="font-bold text-xl">{faq("title")}</h2>
          {groups.map((group) => (
            <section className="flex flex-col gap-2" key={group.title}>
              <h3 className="font-semibold">{group.title}</h3>
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
        </section>

        <section className="flex flex-col gap-6" id="contact">
          <h2 className="font-bold text-xl">{contact("title")}</h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {details.map(({ href, icon: Icon, label, ltr, note, value }) => (
              <li
                className="flex flex-col gap-2 rounded-lg border p-5"
                key={label}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-pink-text">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <p className="font-medium">{label}</p>
                {note ? (
                  <p className="text-muted-foreground text-sm">{note}</p>
                ) : null}
                {href ? (
                  <a
                    className="font-medium text-pink-text hover:underline"
                    dir={ltr ? "ltr" : undefined}
                    href={href}
                    {...(href.startsWith("https://")
                      ? { rel: "noopener noreferrer", target: "_blank" }
                      : {})}
                  >
                    {value}
                  </a>
                ) : (
                  <p>{value}</p>
                )}
              </li>
            ))}
          </ul>
          <Suspense>
            <ContactForm apiUrl={env.NEXT_PUBLIC_API_URL} />
          </Suspense>
        </section>
      </Section>
    </>
  );
};

export default Help;
