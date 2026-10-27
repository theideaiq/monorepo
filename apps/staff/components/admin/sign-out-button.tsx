import { Button } from "@repo/design-system/components/ui/button";
import { LogOutIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ComponentProps } from "react";
import { passLink } from "@/lib/admin/pass";

/**
 * Signs out through The IDEA Pass (`/sign-out`), which then comes back to
 * Staff, where signed-out visitors are sent to the Pass sign-in.
 */
export const SignOutButton = async ({
  className,
  variant = "outline",
}: Pick<ComponentProps<typeof Button>, "className" | "variant">) => {
  const locale = await getLocale();
  const t = await getTranslations("auth");

  return (
    <Button asChild className={className} variant={variant}>
      <a href={passLink("/sign-out", locale)}>
        <LogOutIcon className="rtl:rotate-180" />
        {t("signOut")}
      </a>
    </Button>
  );
};
