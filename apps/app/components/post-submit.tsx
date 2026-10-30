import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { PenLine } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { applicationsPath } from "@/lib/club";

/** Invites members to submit their work (Pass → Applications → Submissions). */
export const PostSubmit = async ({ locale }: { readonly locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.club.submit" });
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border bg-surface-raised p-8 shadow-1">
      <PenLine aria-hidden="true" className="size-8 text-pink-text" />
      <h2 className="font-bold text-2xl">{t("title")}</h2>
      <p className="max-w-2xl text-muted-foreground">{t("description")}</p>
      <Button asChild>
        <Link href={applicationsPath("submissions")}>{t("button")}</Link>
      </Button>
    </div>
  );
};
