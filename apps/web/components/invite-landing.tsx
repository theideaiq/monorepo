"use client";

import { useAuth } from "@repo/auth/provider";
import { formatPrice, INVITE_DISCOUNT_CAP } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { GiftIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { rememberInvite, useClaimInvite } from "@/lib/invites";

/**
 * A friend's invite: remembers the code, and claims it at once for someone
 * already signed in (otherwise after they join).
 */
export const InviteLanding = ({ code }: { readonly code: string }) => {
  const t = useTranslations("web.invite");
  const locale = useLocale() as Locale;
  const { loading, user } = useAuth();
  const claim = useClaimInvite();
  const started = useRef(false);

  useEffect(() => {
    if (loading || started.current) {
      return;
    }
    started.current = true;
    // Signed in: claim now. Otherwise keep it for after they join
    // (InviteClaimer claims it then).
    if (user) {
      claim.mutate(code.trim().toLowerCase());
    } else {
      rememberInvite(code);
    }
  }, [claim, code, loading, user]);

  const cap = formatPrice(INVITE_DISCOUNT_CAP, locale);
  let message = t("offer", { cap });
  if (claim.isSuccess) {
    message = claim.data
      ? t("claimedBy", { cap, name: claim.data })
      : t("claimed", { cap });
  } else if (claim.isError) {
    message = t("notEligible");
  }

  return (
    <section className="container mx-auto flex max-w-xl flex-col items-center gap-6 px-4 py-20 text-center">
      <GiftIcon aria-hidden="true" className="size-12 text-pink-text" />
      <h1 className="text-balance font-bold text-3xl tracking-tight md:text-4xl">
        {t("title")}
      </h1>
      <p className="text-lg text-muted-foreground" role="status">
        {message}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {user ? null : (
          <Button asChild size="lg">
            <Link
              href={{ pathname: "/sign-in", query: { return_to: "/store" } }}
            >
              {t("join")}
            </Link>
          </Button>
        )}
        <Button asChild size="lg" variant={user ? "default" : "outline"}>
          <Link href="/store">{t("shop")}</Link>
        </Button>
      </div>
    </section>
  );
};
