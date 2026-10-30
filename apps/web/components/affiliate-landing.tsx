"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Link } from "@repo/internationalization/navigation";
import { TicketPercentIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import {
  rememberAffiliateCode,
  useApplyAffiliateCode,
} from "@/lib/affiliate-code";

/**
 * A partner's link: puts the code on the cart for someone signed in, and
 * otherwise keeps it until they are (AffiliateCodeApplier does it then).
 */
export const AffiliateLanding = ({ code }: { readonly code: string }) => {
  const t = useTranslations("web.affiliate");
  const { loading, user } = useAuth();
  const apply = useApplyAffiliateCode();
  const started = useRef(false);

  useEffect(() => {
    if (loading || started.current) {
      return;
    }
    started.current = true;
    if (user) {
      apply.mutate(code);
    } else {
      rememberAffiliateCode(code);
    }
  }, [apply, code, loading, user]);

  let message = t("offer", { code });
  if (apply.isSuccess) {
    message = apply.data ? t("notUsable", { code }) : t("applied", { code });
  } else if (apply.isError) {
    message = t("failed");
  }

  return (
    <section className="container mx-auto flex max-w-xl flex-col items-center gap-6 px-4 py-20 text-center">
      <TicketPercentIcon
        aria-hidden="true"
        className="size-12 text-pink-text"
      />
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
