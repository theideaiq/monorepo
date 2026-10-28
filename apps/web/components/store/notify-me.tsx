"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { localePath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellIcon, BellOffIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { productHref } from "@/components/store/product-card";
import { requireUserId, unwrap } from "@/lib/queries";

const alertKey = (userId: string, productId: string) =>
  ["product-alert", userId, productId] as const;

/**
 * A product nobody has on offer: "Notify me" asks to hear, once, when a
 * copy goes on sale (product_alerts). Signed out, it goes to sign-in first.
 */
export const NotifyMe = ({
  productId,
  slug,
}: {
  readonly productId: string;
  readonly slug: string;
}) => {
  const t = useTranslations("app.store.product.notify");
  const locale = useLocale();
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const key = alertKey(user?.id ?? "", productId);

  const waiting = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (
        unwrap(
          await supabase
            .from("product_alerts")
            .select("product_id")
            .eq("product_id", productId)
        ) ?? []
      ).length > 0,
    queryKey: key,
  });

  const toggle = useMutation({
    mutationFn: async (wanted: boolean) => {
      const userId = requireUserId(user?.id);
      if (wanted) {
        unwrap(
          await supabase
            .from("product_alerts")
            .upsert({ product_id: productId, user_id: userId })
        );
      } else {
        unwrap(
          await supabase
            .from("product_alerts")
            .delete()
            .eq("product_id", productId)
        );
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  if (!user) {
    return (
      <div className="grid gap-2">
        <p className="text-muted-foreground text-sm">{t("none")}</p>
        <Button asChild className="justify-self-start" variant="outline">
          <Link
            href={{
              pathname: "/sign-in",
              query: { return_to: localePath(locale, productHref(slug)) },
            }}
          >
            <BellIcon />
            {t("notify")}
          </Link>
        </Button>
      </div>
    );
  }

  const on = waiting.data === true;
  return (
    <div className="grid gap-2">
      <p className="text-muted-foreground text-sm" role="status">
        {on ? t("waiting") : t("none")}
      </p>
      <Button
        aria-pressed={on}
        className="justify-self-start"
        disabled={waiting.isPending || toggle.isPending}
        onClick={() => toggle.mutate(!on)}
        variant="outline"
      >
        {on ? <BellOffIcon /> : <BellIcon />}
        {on ? t("stop") : t("notify")}
      </Button>
      {toggle.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};
