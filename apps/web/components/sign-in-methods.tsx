"use client";

import { useAuth } from "@repo/auth/provider";
import { type SocialProvider, startSocialSignIn } from "@repo/auth/social";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  openInSystemBrowser,
  socialRedirect,
} from "@/components/pass/social-buttons";
import { isNativeApp } from "@/lib/platform";

const NAMES: Record<string, string> = {
  apple: "Apple",
  google: "Google",
  telegram: "Telegram",
};

/**
 * Your Pass → Settings: the ways the person signs in (email, Google, Apple
 * and the others turned on). Another one can be linked; one can be removed
 * while another remains.
 */
export const SignInMethodsCard = ({
  providers,
}: {
  readonly providers: SocialProvider[];
}) => {
  const t = useTranslations("app.settings.signInMethods");
  const locale = useLocale();
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const identities = useQuery({
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUserIdentities();
      if (error) {
        throw error;
      }
      return data.identities;
    },
    queryKey: ["identities", user?.id ?? ""],
  });
  const link = useMutation({
    mutationFn: async (provider: SocialProvider) => {
      const native = isNativeApp();
      const result = await startSocialSignIn(supabase, provider, {
        link: true,
        openExternal: native ? openInSystemBrowser : undefined,
        redirectTo: socialRedirect(locale),
      });
      if (!result.ok) {
        throw new Error(result.error);
      }
    },
  });
  const unlink = useMutation({
    mutationFn: async (identityId: string) => {
      const identity = identities.data?.find(
        (item) => item.identity_id === identityId
      );
      if (!identity) {
        return;
      }
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) {
        throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["identities"] }),
  });

  if (!identities.data) {
    return null;
  }
  const linked = new Set(identities.data.map((item) => item.provider));
  const canRemove = identities.data.length > 1;

  return (
    <Card id="sign-in-methods">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <ul className="grid gap-2">
          {identities.data.map((identity) => (
            <li
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
              key={identity.identity_id}
            >
              <span>
                {identity.provider === "email"
                  ? t("email")
                  : (NAMES[identity.provider] ?? identity.provider)}
                {identity.identity_data?.email ? (
                  <span className="ms-2 text-muted-foreground" dir="ltr">
                    {String(identity.identity_data.email)}
                  </span>
                ) : null}
              </span>
              {canRemove && identity.provider !== "email" ? (
                <Button
                  disabled={unlink.isPending}
                  onClick={() => unlink.mutate(identity.identity_id)}
                  size="sm"
                  variant="ghost"
                >
                  {t("remove")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {providers
            .filter((provider) => !linked.has(provider))
            .map((provider) => (
              <Button
                disabled={link.isPending}
                key={provider}
                onClick={() => link.mutate(provider)}
                size="sm"
                variant="outline"
              >
                {t("add", { provider: NAMES[provider] ?? provider })}
              </Button>
            ))}
        </div>
        {link.isError || unlink.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("failed")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};
