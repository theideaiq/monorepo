"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { LogOutIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { unregisterPushNotifications } from "@/lib/native/push";
import { signOut } from "@/lib/pass/actions";

interface SignOutButtonProps
  extends Pick<ComponentProps<typeof Button>, "className" | "variant"> {
  /** Where to go afterwards (checked again on the server). */
  readonly returnTo?: string | null;
}

/**
 * A sign-out button: removes this device's push registration (iOS/Android
 * apps) while the session is still valid, then posts to the sign-out
 * Server Action.
 */
export const SignOutButton = ({
  className,
  returnTo,
  variant = "outline",
}: SignOutButtonProps) => {
  const t = useTranslations("auth");
  const { supabase } = useAuth();

  const action = async (formData: FormData) => {
    await unregisterPushNotifications(supabase);
    await signOut(formData);
  };

  return (
    <form action={action}>
      {returnTo ? (
        <input name="return_to" type="hidden" value={returnTo} />
      ) : null}
      <Button className={className} type="submit" variant={variant}>
        <LogOutIcon className="rtl:rotate-180" />
        {t("signOut")}
      </Button>
    </form>
  );
};
