"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import type { Locale } from "@repo/internationalization";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { FieldGrid, TextField } from "@/components/admin/fields";
import { Panel } from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { Link } from "@/lib/admin/navigation";
import { type CheckedPass, checkPass } from "../actions";

/**
 * "Check a Pass" at the counter: scan the card's QR code into the first
 * field (a scanner types it), or type the member number and the code.
 */
export const CheckPass = () => {
  const t = useTranslations("admin.customers.checkPass");
  const format = formatters(useLocale() as Locale);
  const [result, setResult] = useState<CheckedPass | null>(null);

  return (
    <Panel description={t("description")} title={t("title")}>
      <ActionForm
        action={checkPass}
        onSuccess={(state) =>
          setResult((state.data?.pass as CheckedPass | undefined) ?? null)
        }
        resetOnSuccess
        silent
      >
        <FieldGrid columns={3}>
          <TextField
            autoComplete="off"
            dir="ltr"
            label={t("scanned")}
            name="scanned"
          />
          <TextField
            autoComplete="off"
            dir="ltr"
            hint={t("codeHint")}
            inputMode="numeric"
            label={t("code")}
            name="code"
          />
          <div className="flex items-end">
            <SubmitButton>{t("check")}</SubmitButton>
          </div>
        </FieldGrid>
      </ActionForm>
      {result ? (
        <div
          className="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm"
          role="status"
        >
          <Badge variant={result.valid ? "default" : "destructive"}>
            {result.valid ? t("valid") : t("invalid")}
          </Badge>
          {result.userId ? (
            <>
              <Link
                className="font-medium hover:underline"
                href={`/customers/${result.userId}`}
              >
                {result.name || t("unnamed")}
              </Link>
              {result.memberNumber ? (
                <span className="text-muted-foreground" dir="ltr">
                  № {result.memberNumber}
                </span>
              ) : null}
              {result.memberSince ? (
                <span className="text-muted-foreground">
                  {t("since", { date: format.date(result.memberSince) })}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-muted-foreground">{t("unknown")}</span>
          )}
        </div>
      ) : null}
    </Panel>
  );
};
