"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { useTranslations } from "next-intl";
import { useDeleteVerification } from "@/lib/partner-verification";

/** "Delete this verification": gone at once, and the partner is told. */
export const DeleteVerification = ({
  id,
  token,
}: {
  readonly id: string;
  readonly token: string;
}) => {
  const t = useTranslations("pass.partnerVerify.delete");
  const remove = useDeleteVerification(id);
  return (
    <div className="grid gap-4 text-center">
      <h1 className="font-semibold text-2xl tracking-tight">{t("title")}</h1>
      {remove.isSuccess ? (
        <p className="text-sm" role="status">
          {t("done")}
        </p>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
          <Button
            disabled={remove.isPending || !token}
            onClick={() => remove.mutate(token)}
            type="button"
            variant="destructive"
          >
            {t("confirm")}
          </Button>
          {remove.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {t("failed")}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
};
