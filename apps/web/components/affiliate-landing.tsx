"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Link } from "@repo/internationalization/navigation";
import { TicketPercentIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import {
  normalizeAffiliateCode,
  rememberAffiliate,
  useTouchAffiliate,
} from "@/lib/affiliates";

/**
 * An affiliate's link: records it at once for someone signed in, otherwise
 * remembers it until they are (AffiliateToucher records it then).
 */
export const AffiliateLanding = ({ code }: { readonly code: string }) => {
  const t = useTranslations("web.affiliateLink");
  const { loading, user } = useAuth();
  const touch = useTouchAffiliate();
  const started = useRef(false);
  const clean = normalizeAffiliateCode(code);

  useEffect(() => {
    if (loading || started.current || !clean) {
      return;
    }
    started.current = true;
    if (user) {
      touch.mutate({ code: clean, via: "link" });
    } else {
      rememberAffiliate(clean);
    }
  }, [clean, loading, touch, user]);

  let message = t("offer");
  if (!clean || touch.isError) {
    message = t("invalid");
  } else if (touch.isSuccess && touch.data?.name) {
    message = t("from", { name: touch.data.name });
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
              {t("signIn")}
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
