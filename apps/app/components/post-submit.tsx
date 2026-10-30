import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { PenLine } from "lucide-react";
import { getTranslations } from "next-intl/server";

/** Invites members to submit their work from "Yours" on the Club page. */
export const PostSubmit = async ({ locale }: { readonly locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.club.submit" });
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border bg-surface-raised p-8 shadow-1">
      <PenLine aria-hidden="true" className="size-8 text-pink-text" />
      <h2 className="font-bold text-2xl">{t("title")}</h2>
      <p className="max-w-2xl text-muted-foreground">{t("description")}</p>
      <Button asChild>
        <a href="#yours">{t("button")}</a>
      </Button>
    </div>
  );
};
