import { Highlight } from "@repo/design-system/components/brand/highlight";
import { PinkBand } from "@repo/design-system/components/brand/pink-band";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { MoveRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { env } from "@/env";
import { appLink, passSignInLink } from "@/lib/links";

/** The page's main call to action, to open The IDEA app: the Pink Band. */
export const AppCta = async ({ locale }: { readonly locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.appCta" });

  return (
    <PinkBand
      action={
        <>
          <Button asChild size="lg" variant="brand">
            <a href={appLink(env.NEXT_PUBLIC_APP_URL, locale)}>
              {t("button")} <MoveRight className="size-4 rtl:rotate-180" />
            </a>
          </Button>
          <Button asChild className={onPinkOutline} size="lg" variant="outline">
            <a href={passSignInLink(env.NEXT_PUBLIC_APP_URL, locale)}>
              {t("signIn")}
            </a>
          </Button>
        </>
      }
      description={t("description")}
      title={
        <>
          {t("title")} <Highlight>{t("highlight")}</Highlight>
        </>
      }
    />
  );
};

/** A secondary button on the Pink Band: white outline and text. */
export const onPinkOutline =
  "border-on-pink text-on-pink hover:bg-on-pink/10 hover:text-on-pink focus-visible:ring-on-pink focus-visible:ring-offset-idea-pink";
