"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { formatDate } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { useActiveOrganization } from "@/components/organization-provider";
import {
  organizationCheckError,
  useOrganizationVerification,
  useRequestOrganizationCheck,
} from "@/lib/verification-queries";

const ACCEPT = "image/png,image/jpeg,image/webp,application/pdf";

/** By a verified domain or an official letter; societies add an approval. */
const RequestForm = ({
  organizationId,
}: {
  readonly organizationId: string;
}) => {
  const t = useTranslations("app.business.settings.verification");
  const id = useId();
  const request = useRequestOrganizationCheck(organizationId);
  const [method, setMethod] = useState<"domain" | "letter">("domain");
  const [letter, setLetter] = useState<File | null>(null);
  const [society, setSociety] = useState(false);
  const [university, setUniversity] = useState("");
  const [approval, setApproval] = useState<File | null>(null);

  const ready =
    (method === "domain" || letter) &&
    (!society || (approval && university.trim()));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    request.mutate({ approval, letter, method, society, university });
  };

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">{t("how")}</legend>
        {(["domain", "letter"] as const).map((value) => (
          <Button
            aria-pressed={method === value}
            key={value}
            onClick={() => setMethod(value)}
            size="sm"
            type="button"
            variant={method === value ? "default" : "outline"}
          >
            {t(value === "domain" ? "byDomain" : "byLetter")}
          </Button>
        ))}
      </fieldset>
      {method === "domain" ? (
        <p className="text-muted-foreground text-sm">{t("domainHint")}</p>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor={`${id}-letter`}>{t("letter")}</Label>
          <Input
            accept={ACCEPT}
            id={`${id}-letter`}
            onChange={(event) => setLetter(event.target.files?.[0] ?? null)}
            required
            type="file"
          />
          <p className="text-muted-foreground text-xs">{t("letterHint")}</p>
        </div>
      )}
      <label
        className="flex items-center gap-2 text-sm"
        htmlFor={`${id}-society`}
      >
        <input
          checked={society}
          id={`${id}-society`}
          onChange={(event) => setSociety(event.target.checked)}
          type="checkbox"
        />
        {t("society")}
      </label>
      {society ? (
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`${id}-university`}>{t("university")}</Label>
            <Input
              id={`${id}-university`}
              maxLength={160}
              onChange={(event) => setUniversity(event.target.value)}
              required
              value={university}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-approval`}>{t("approval")}</Label>
            <Input
              accept={ACCEPT}
              id={`${id}-approval`}
              onChange={(event) => setApproval(event.target.files?.[0] ?? null)}
              required
              type="file"
            />
          </div>
        </div>
      ) : null}
      {request.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t(
            `errors.${organizationCheckError(
              request.error instanceof Error
                ? request.error.message
                : (request.error as { message?: string } | null)?.message
            )}`
          )}
        </p>
      ) : null}
      <Button
        className="justify-self-start"
        disabled={request.isPending || !ready}
        type="submit"
      >
        {t(method === "domain" && !society ? "verify" : "send")}
      </Button>
    </form>
  );
};

/**
 * Partners → Organization: whether The IDEA has verified the organization,
 * and (for owners and admins) how to ask.
 */
export const OrganizationVerificationCard = () => {
  const t = useTranslations("app.business.settings.verification");
  const locale = useLocale() as Locale;
  const { active, canManage } = useActiveOrganization();
  const status = useOrganizationVerification(active.id);
  if (!status.isSuccess) {
    return null;
  }
  const row = status.data;

  let body = canManage ? (
    <RequestForm organizationId={active.id} />
  ) : (
    <p className="text-muted-foreground text-sm">{t("askAdmin")}</p>
  );
  if (row?.status === "verified") {
    body = (
      <p className="text-sm">
        {t("verifiedOn", {
          date: row.verified_at
            ? formatDate(new Date(row.verified_at), locale)
            : "",
        })}
      </p>
    );
  } else if (row?.status === "pending") {
    body = <p className="text-sm">{t("waiting")}</p>;
  }

  return (
    <Card className="max-w-2xl" id="verification">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {t("title")}
          {row?.status === "verified" ? <Badge>{t("verified")}</Badge> : null}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {row?.status === "rejected" && row.reject_reason ? (
          <p className="text-destructive text-sm">
            {t("rejected", { reason: row.reject_reason })}
          </p>
        ) : null}
        {body}
      </CardContent>
    </Card>
  );
};
