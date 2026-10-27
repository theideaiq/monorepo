"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/design-system/components/ui/alert-dialog";
import type { Button } from "@repo/design-system/components/ui/button";
import { useTranslations } from "next-intl";
import { type ComponentProps, type ReactNode, useRef } from "react";
import { ActionForm, type FormAction, SubmitButton } from "./action-form";

interface ActionButtonProps {
  readonly action: FormAction;
  readonly children: ReactNode;
  readonly className?: string;
  /** Asks first, e.g. before deleting. */
  readonly confirm?: { description?: string; title: string };
  /** Hidden fields sent with the action (e.g. the row id). */
  readonly fields: Record<string, string>;
  readonly size?: ComponentProps<typeof Button>["size"];
  readonly variant?: ComponentProps<typeof Button>["variant"];
}

/** A one-click Server Action (status change, delete…) with hidden fields. */
export const ActionButton = ({
  action,
  children,
  className,
  confirm,
  fields,
  size = "sm",
  variant = "outline",
}: ActionButtonProps) => {
  const t = useTranslations("admin.common");
  const submit = useRef<HTMLButtonElement>(null);

  return (
    <ActionForm action={action} className="contents">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      {confirm ? (
        <button className="hidden" ref={submit} tabIndex={-1} type="submit" />
      ) : null}
      {confirm ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <SubmitButton
              className={className}
              size={size}
              type="button"
              variant={variant}
            >
              {children}
            </SubmitButton>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
              {confirm.description ? (
                <AlertDialogDescription>
                  {confirm.description}
                </AlertDialogDescription>
              ) : null}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => submit.current?.click()}>
                {t("confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <SubmitButton className={className} size={size} variant={variant}>
          {children}
        </SubmitButton>
      )}
    </ActionForm>
  );
};
