import type { Locale } from "@repo/internationalization";
import { localePath } from "@repo/internationalization";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PassEmbed } from "@/components/pass/pass-embed";
import { embedClientId, embedTheme } from "@/lib/pass-embed";
import { createPublicClient } from "@/lib/supabase";

interface EmbedProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const generateMetadata = async ({
  params,
}: EmbedProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pass.embed" });
  return { robots: { follow: false, index: false }, title: t("meta") };
};

/** The app, when it may show the live card: its name and framing origins. */
const embedSite = async (clientId: string | null) => {
  const supabase = createPublicClient();
  if (!(clientId && supabase)) {
    return null;
  }
  const { data } = await supabase
    .rpc("pass_card_embed_site", { client: clientId })
    .maybeSingle();
  return data ?? null;
};

/**
 * /pass/embed?client_id=…: the live Pass card a partner shows in a frame
 * on its own pages (frame-ancestors: the app's verified domains, set in
 * proxy.ts). `lang=ar|en` picks the language, `theme=light|dark` the
 * colours around the card.
 */
const EmbedPage = async ({ params, searchParams }: EmbedProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const clientId = embedClientId(first(query.client_id));
  const theme = embedTheme(first(query.theme));
  const lang = first(query.lang);

  if ((lang === "ar" || lang === "en") && lang !== locale && clientId) {
    const next = new URLSearchParams({ client_id: clientId });
    if (theme) {
      next.set("theme", theme);
    }
    redirect(`${localePath(lang, "/pass/embed")}?${next}`);
  }

  const [site, t] = await Promise.all([
    embedSite(clientId),
    getTranslations({ locale, namespace: "pass.embed" }),
  ]);

  return (
    <main className="mx-auto w-full max-w-md">
      {/* The partner's page shows through around the card. */}
      <style>{"html,body{background:transparent!important}"}</style>
      {site && clientId ? (
        <PassEmbed
          clientId={clientId}
          origins={site.origins}
          site={site.name}
          theme={theme}
        />
      ) : (
        <p className="p-4 text-center text-muted-foreground text-sm">
          {t("unavailable")}
        </p>
      )}
    </main>
  );
};

export default EmbedPage;
