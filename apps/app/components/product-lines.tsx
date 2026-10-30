import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import {
  Building2,
  IdCard,
  MoveRight,
  Repeat,
  ShoppingBag,
  UsersRound,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

const lines = [
  { href: "/store", icon: ShoppingBag, id: "store" },
  { href: "/plus", icon: Repeat, id: "plus" },
  { href: "/club", icon: UsersRound, id: "club" },
  { href: "/pass", icon: IdCard, id: "pass" },
  { href: "/partners", icon: Building2, id: "business" },
] as const;

/** The IDEA's four products and Partners, each linking to its page. */
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
