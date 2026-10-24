import { Button } from "@repo/design-system/components/ui/button";
import { LogOutIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { signOut } from "@/lib/pass/actions";

interface SignOutButtonProps
  extends Pick<ComponentProps<typeof Button>, "className" | "variant"> {
  /** Where to go afterwards (checked again on the server). */
  readonly returnTo?: string | null;
}

/** A sign-out button (a form posting to the sign-out Server Action). */
export const SignOutButton = ({
  className,
  returnTo,
  variant = "outline",
}: SignOutButtonProps) => {
  const t = useTranslations("auth");

  return (
    <form action={signOut}>
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
