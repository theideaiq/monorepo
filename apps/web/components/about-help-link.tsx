import { Link } from "@repo/internationalization/navigation";
import { CircleHelp, MoveRight } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * "About & help" at the end of My Pass (and of sign-in, for visitors):
 * /about holds what wider screens show in the footer (careers, partners,
 * contact, legal, language and theme, the version). Phones have no footer.
 */
export const AboutHelpLink = () => {
  const t = useTranslations("web.nav");
  return (
    <Link
      className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 transition-shadow hover:shadow-2"
      href="/about"
    >
      <span className="flex items-center gap-3">
        <CircleHelp aria-hidden="true" className="size-5 text-pink-text" />
        <span className="grid gap-0.5">
          <span className="font-medium text-sm">{t("aboutHelp")}</span>
          <span className="text-muted-foreground text-xs">
            {t("aboutHelpHint")}
          </span>
        </span>
      </span>
      <MoveRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground rtl:rotate-180"
      />
    </Link>
  );
};
