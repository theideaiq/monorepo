import { Button } from "@repo/design-system/components/ui/button";
import { LogOutIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { signOut } from "@/lib/auth-actions";

/** A sign-out button (a form posting to the sign-out Server Action). */
export const SignOutButton = ({
  className,
  variant = "outline",
}: Pick<ComponentProps<typeof Button>, "className" | "variant">) => {
  const t = useTranslations("auth");

  return (
    <form action={signOut}>
      <Button className={className} type="submit" variant={variant}>
        <LogOutIcon className="rtl:rotate-180" />
        {t("signOut")}
      </Button>
    </form>
  );
};
