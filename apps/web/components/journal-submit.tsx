import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { PenLine } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { env } from "@/env";
import { appLink } from "@/lib/links";

/** Invites members to submit their work in the app. */
export const JournalSubmit = async ({
  locale,
}: {
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.journal.submit" });
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border bg-muted/40 p-8">
      <PenLine aria-hidden="true" className="size-8 text-primary" />
      <h2 className="font-bold text-2xl">{t("title")}</h2>
      <p className="max-w-2xl text-muted-foreground">{t("description")}</p>
      <Button asChild>
        <a href={appLink(env.NEXT_PUBLIC_APP_URL, locale, "/submissions")}>
          {t("button")}
        </a>
      </Button>
    </div>
  );
};
