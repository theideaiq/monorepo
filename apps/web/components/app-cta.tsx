import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { MoveRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { env } from "@/env";
import { appLink, passSignInLink } from "@/lib/links";

/** The call to action to open The IDEA app. */
export const AppCta = async ({ locale }: { readonly locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.appCta" });

  return (
    <section className="container mx-auto px-4 py-14">
      <div className="flex flex-col items-center gap-6 rounded-lg bg-foreground px-6 py-14 text-center text-background">
        <h2 className="max-w-2xl text-balance font-bold text-3xl tracking-tight md:text-4xl">
          {t("title")}
        </h2>
        <p className="max-w-2xl text-balance text-background/75">
          {t("description")}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <a href={appLink(env.NEXT_PUBLIC_APP_URL, locale)}>
              {t("button")} <MoveRight className="size-4 rtl:rotate-180" />
            </a>
          </Button>
          <Button
            asChild
            className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background"
            size="lg"
            variant="outline"
          >
            <a href={passSignInLink(env.NEXT_PUBLIC_APP_URL, locale)}>
              {t("signIn")}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};
