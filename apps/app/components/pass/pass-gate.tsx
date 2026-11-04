"use client";

import { useAuth } from "@repo/auth/provider";
import { BulbKicker } from "@repo/design-system/components/brand/bulb-kicker";
import { Highlight } from "@repo/design-system/components/brand/highlight";
import { Button } from "@repo/design-system/components/ui/button";
import { Link, usePathname } from "@repo/internationalization/navigation";
import {
  BadgePercent,
  Heart,
  IdCard,
  Lightbulb,
  Package,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { RequireAuth } from "@/components/gates";
import { FullPageSpinner } from "@/components/states";

const parts = [
  { icon: IdCard, id: "card" },
  { icon: Package, id: "orders" },
  { icon: Lightbulb, id: "bulbs" },
  { icon: Heart, id: "saved" },
  { icon: Users, id: "family" },
  { icon: BadgePercent, id: "perks" },
] as const;

/**
 * What the Pass is, for someone who isn't signed in on `/pass`: what it
 * holds, and one button to sign in or get one (an email code does both).
 */
export const PassExplainer = () => {
  const t = useTranslations("pass.explainer");
  return (
    <div className="container mx-auto grid max-w-3xl gap-8 px-4 py-10">
      <div className="grid justify-items-center gap-3 text-center">
        <BulbKicker />
        <h1 className="text-balance text-h2 md:text-h1">
          {t("title")} <Highlight>{t("highlight")}</Highlight>
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground">
          {t("description")}
        </p>
        <Button asChild className="mt-2" size="lg">
          <Link href={{ pathname: "/sign-in", query: { return_to: "/pass" } }}>
            {t("signIn")}
          </Link>
        </Button>
        <p className="text-muted-foreground text-sm">{t("free")}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {parts.map(({ icon: Icon, id }) => (
          <li className="flex gap-3 rounded-lg border bg-card p-4" key={id}>
            <Icon
              aria-hidden="true"
              className="size-5 shrink-0 text-pink-text"
            />
            <span className="grid gap-0.5">
              <span className="font-medium">{t(`parts.${id}.title`)}</span>
              <span className="text-muted-foreground text-sm">
                {t(`parts.${id}.description`)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * The Pass pages' gate: signed-out visitors to `/pass` itself see what the
 * Pass is; every other Pass page sends them to sign in (`RequireAuth`).
 */
export const PassGate = ({ children }: { readonly children: ReactNode }) => {
  const { loading, user } = useAuth();
  const pathname = usePathname();
  if (pathname === "/pass" && !user) {
    return loading ? <FullPageSpinner /> : <PassExplainer />;
  }
  return <RequireAuth>{children}</RequireAuth>;
};
