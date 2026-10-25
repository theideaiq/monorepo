import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import {
  Building2,
  Gamepad2,
  MoveRight,
  Newspaper,
  ShoppingBag,
  Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

const lines = [
  { href: "/store", icon: ShoppingBag, id: "megastore" },
  { href: "/plus", icon: Gamepad2, id: "plus" },
  { href: "/suite", icon: Building2, id: "suite" },
  { href: "/club", icon: Users, id: "club" },
  { href: "/post", icon: Newspaper, id: "post" },
] as const;

/** The five product lines of the ecosystem, each linking to its page. */
export const ProductLines = async ({ locale }: { readonly locale: Locale }) => {
  const t = await getTranslations({ locale });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {lines.map(({ href, icon: Icon, id }) => (
        <Link
          className="group flex flex-col gap-3 rounded-lg border border-t-4 border-t-primary bg-card p-5 transition-transform even:border-t-brand hover:-translate-y-1"
          href={href}
          key={id}
        >
          <Icon aria-hidden="true" className="size-8 text-pink-text" />
          <h3 className="font-semibold text-lg">{t(`store.lines.${id}`)}</h3>
          <p className="flex-1 text-muted-foreground text-sm leading-relaxed">
            {t(`web.about.lines.${id}`)}
          </p>
          <span className="inline-flex items-center gap-1 font-medium text-pink-text text-sm">
            {t("web.ui.learnMore")}
            <MoveRight className="size-4 rtl:rotate-180" />
          </span>
        </Link>
      ))}
    </div>
  );
};
