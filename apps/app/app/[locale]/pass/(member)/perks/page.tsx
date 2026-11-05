import { localePath } from "@repo/internationalization";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { PerkCard, type PerkRow } from "@/components/pass/partner-perks";
import { titleFrom } from "@/lib/app-metadata";
import { getPassSession } from "@/lib/pass/session";

export const generateMetadata = titleFrom((t) =>
  t("pass.partnerPerks.hub.title")
);

/**
 * `/pass/perks` (A15): every partner perk in one place. Perks come with the
 * Pass (D3), so everyone with a Pass sees all of them: first those they can
 * use now, then those a student badge or a Plus plan would open, each with
 * the step to take. Partners set who a perk is for; nothing here is made up.
 */
const PerksPage = async () => {
  const [locale, session] = await Promise.all([getLocale(), getPassSession()]);
  if (!session) {
    redirect(
      `${localePath(locale, "/sign-in")}?${new URLSearchParams({ return_to: localePath(locale, "/pass/perks") })}`
    );
  }
  const [t, { data }] = await Promise.all([
    getTranslations("pass.partnerPerks"),
    session.supabase.rpc("my_perks"),
  ]);
  const perks = (data ?? []) as PerkRow[];
  const open = perks.filter((perk) => perk.open);
  const closed = perks.filter((perk) => !perk.open);

  return (
    <>
      <PageHeader title={t("hub.title")} />
      <div className="grid max-w-3xl gap-8">
        <p className="text-muted-foreground">{t("description")}</p>
        {perks.length === 0 ? (
          <p className="text-muted-foreground">{t("hub.empty")}</p>
        ) : null}
        {open.length > 0 ? (
          <section aria-labelledby="perks-yours" className="grid gap-3">
            <h2 className="font-semibold text-lg" id="perks-yours">
              {t("hub.yours")}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {open.map((perk) => (
                <PerkCard key={perk.id} locale={locale} perk={perk} t={t} />
              ))}
            </ul>
          </section>
        ) : null}
        {closed.length > 0 ? (
          <section aria-labelledby="perks-more" className="grid gap-3">
            <h2 className="font-semibold text-lg" id="perks-more">
              {t("hub.more")}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {closed.map((perk) => (
                <PerkCard key={perk.id} locale={locale} perk={perk} t={t} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
};

export default PerksPage;
