import { project } from "@repo/config";
import type { Locale } from "@repo/internationalization";
import { LifeBuoy, Mail, MapPin, Send } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { PageHero } from "@/components/page-hero";
import { env } from "@/env";
import { pagePath, telegram } from "@/lib/links";
import { localizedMetadata } from "@/lib/metadata";
import { ContactForm } from "./components/contact-form";

interface ContactProps {
  params: Promise<{
    locale: Locale;
  }>;
}

export const generateMetadata = async ({
  params,
}: ContactProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.contact.meta" });

  return localizedMetadata(locale, "/contact", {
    description: t("description"),
    title: t("title"),
  });
};

const Contact = async ({ params }: ContactProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.contact" });

  const details: {
    href?: string;
    icon: typeof Mail;
    label: string;
    /** Values such as addresses and handles read left to right. */
    ltr?: boolean;
    note?: string;
    value?: string;
  }[] = [
    {
      href: pagePath(locale, "/pass/support"),
      icon: LifeBuoy,
      label: t("details.support"),
      note: t("details.supportNote"),
      value: t("details.supportCta"),
    },
    {
      href: `mailto:${project.supportEmail}`,
      icon: Mail,
      label: t("details.email"),
      ltr: true,
      note: t("details.emailNote"),
      value: project.supportEmail,
    },
    {
      href: telegram.bot,
      icon: Send,
      label: t("details.telegram"),
      ltr: true,
      note: t("details.telegramNote"),
      value: "@TheIdeaDroidBot",
    },
    {
      icon: MapPin,
      label: t("details.location"),
      value: t("details.address"),
    },
  ];

  return (
    <>
      <PageHero subtitle={t("description")} title={t("title")} />
      <div className="container mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1fr_1.4fr]">
        <ul className="flex flex-col gap-4">
          {details.map(({ href, icon: Icon, label, ltr, note, value }) => (
            <li className="flex gap-4 rounded-lg border p-5" key={label}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-pink-text">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="font-medium">{label}</p>
                {note ? (
                  <p className="text-muted-foreground text-sm">{note}</p>
                ) : null}
                {href ? (
                  <a
                    className="font-medium text-pink-text hover:underline"
                    dir={ltr ? "ltr" : undefined}
                    href={href}
                    {...(href.startsWith("https://t.me")
                      ? { rel: "noopener noreferrer", target: "_blank" }
                      : {})}
                  >
                    {value}
                  </a>
                ) : (
                  <p>{value}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
        <Suspense>
          <ContactForm apiUrl={env.NEXT_PUBLIC_API_URL} />
        </Suspense>
      </div>
    </>
  );
};

export default Contact;
