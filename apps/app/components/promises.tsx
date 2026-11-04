import { cn } from "@repo/design-system/lib/utils";
import { Link } from "@repo/internationalization/navigation";
import { CalendarClock, DoorOpen, ShieldCheck, Tag } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * The brand's promises (`docs/brand/BRAND_GUIDELINES.md` section 1), each
 * linked to the policy section that backs it. A promise is shown only with
 * its policy: "a human answers" waits for a support policy (PROGRESS.md).
 */
export const promises = [
  { href: "/legal/terms#section-4", icon: Tag, id: "price" },
  { href: "/legal/delivery#section-3", icon: CalendarClock, id: "when" },
  { href: "/legal/returns#section-7", icon: ShieldCheck, id: "condition" },
  { href: "/legal/plus#section-7", icon: DoorOpen, id: "leave" },
] as const;

interface PromisesProps {
  readonly className?: string;
  /** A short list for the product page and checkout; a grid on home. */
  readonly compact?: boolean;
}

/** What every seller on The IDEA keeps, with where each is written down. */
export const Promises = ({ className, compact = false }: PromisesProps) => {
  const t = useTranslations("web.promises");

  return (
    <section
      aria-label={t("title")}
      className={cn(compact ? "grid gap-2" : "grid gap-4", className)}
    >
      {compact ? null : <h2 className="font-semibold text-lg">{t("title")}</h2>}
      <ul
        className={cn(
          "grid",
          compact ? "gap-1.5 text-sm" : "gap-3 sm:grid-cols-2 lg:grid-cols-4"
        )}
      >
        {promises.map(({ href, icon: Icon, id }) => (
          <li key={id}>
            <Link
              className={cn(
                "group flex items-start gap-3 rounded-lg transition-colors",
                compact
                  ? "text-muted-foreground hover:text-foreground"
                  : "h-full border bg-card p-4 hover:shadow-2"
              )}
              href={href}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "shrink-0 text-pink-text",
                  compact ? "mt-0.5 size-4" : "size-5"
                )}
              />
              <span className="grid gap-0.5">
                <span className={compact ? undefined : "font-medium"}>
                  {t(`items.${id}.title`)}
                </span>
                {compact ? null : (
                  <span className="text-muted-foreground text-sm underline-offset-4 group-hover:underline">
                    {t(`items.${id}.policy`)}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
