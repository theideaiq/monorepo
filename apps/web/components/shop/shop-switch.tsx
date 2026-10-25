import { cn } from "@repo/design-system/lib/utils";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";

const tabs = [
  { href: "/", id: "buy" },
  { href: "/plus", id: "rent" },
] as const;

/** Buy | Rent: the two storefronts, Home and Rent (The IDEA Plus). */
export const ShopSwitch = async ({
  active,
  locale,
}: {
  readonly active: "buy" | "rent";
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.shop" });
  return (
    <nav
      aria-label={t("label")}
      className="inline-flex rounded-full border bg-muted p-1"
    >
      {tabs.map(({ href, id }) => (
        <Link
          aria-current={active === id ? "page" : undefined}
          className={cn(
            "rounded-full px-5 py-1.5 font-medium text-sm transition-colors",
            active === id
              ? "bg-background text-foreground shadow-1"
              : "text-muted-foreground hover:text-foreground"
          )}
          href={href}
          key={id}
        >
          {t(id)}
        </Link>
      ))}
    </nav>
  );
};
