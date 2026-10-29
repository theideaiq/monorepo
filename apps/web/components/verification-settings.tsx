"use client";

import { localized } from "@repo/commerce";
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
import {
  formatCalendarDate,
  formatDate,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { ShieldCheckIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { ApiError } from "@/lib/api";
import { useUniversities } from "@/lib/student-queries";
import { confirmError, studentCodeError } from "@/lib/students";
import {
  type MyVerifications,
  useConfirmEducatorEmail,
  useMyVerifications,
  useRequestEducatorCheck,
  useRequestIdentityCheck,
  useSendEducatorCode,
} from "@/lib/verification-queries";

const ACCEPT = "image/png,image/jpeg,image/webp,application/pdf";
const PHOTOS = "image/png,image/jpeg,image/webp";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs";

const IDENTITY_FILES = ["front", "back", "selfie"] as const;

/** Both sides of the National Card and a selfie, for support to check. */
const IdentityForm = () => {
  const t = useTranslations("app.settings.verification.identity");
  const id = useId();
  const request = useRequestIdentityCheck();
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const chosen = IDENTITY_FILES.map((key) => files[key] ?? null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const [front, back, selfie] = chosen;
    if (front && back && selfie) {
      request.mutate([front, back, selfie]);
    }
  };

  return (
    <form className="grid gap-3" onSubmit={submit}>
      {IDENTITY_FILES.map((key) => (
        <div className="grid gap-2" key={key}>
          <Label htmlFor={`${id}-${key}`}>{t(key)}</Label>
          <Input
            accept={PHOTOS}
            id={`${id}-${key}`}
            onChange={(event) =>
              setFiles((current) => ({
                ...current,
                [key]: event.target.files?.[0] ?? null,
              }))
            }
            required
            type="file"
          />
        </div>
      ))}
      <p className="text-muted-foreground text-xs">{t("note")}</p>
      <div>
        <Button
          disabled={request.isPending || chosen.some((file) => !file)}
          type="submit"
        >
          {t("send")}
        </Button>
      </div>
      {request.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </form>
  );
};

const Identity = ({
  identity,
}: {
  readonly identity: MyVerifications["identity"];
}) => {
  const t = useTranslations("app.settings.verification.identity");
  const locale = useLocale() as Locale;

  let body = <IdentityForm />;
  if (identity.verified && identity.verified_at) {
    body = (
      <p className="text-sm">
        {t("verified", {
          date: formatDate(new Date(identity.verified_at), locale),
          name: identity.name ?? "",
        })}
      </p>
    );
  } else if (identity.pending) {
    body = <p className="text-sm">{t("waiting")}</p>;
  }

  return (
    <section aria-labelledby="verification-identity" className="grid gap-3">
      <div>
        <h2 className="font-medium" id="verification-identity">
          {t("title")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      {!(identity.verified || identity.pending) && identity.rejected_reason ? (
        <p className="text-destructive text-sm">
          {t("rejected", { reason: identity.rejected_reason })}
        </p>
      ) : null}
      {body}
    </section>
  );
};

/** A staff email at a university: a code is emailed and typed back. */
const EducatorEmailForm = () => {
  const t = useTranslations("app.settings.verification.educator");
  const errors = useTranslations("app.settings.student.errors");
  const locale = useLocale();
  const id = useId();
  const universities = useUniversities();
  const send = useSendEducatorCode();
  const confirm = useConfirmEducatorEmail();
  const [university, setUniversity] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  if (send.isSuccess) {
    return (
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          confirm.mutate(code.trim());
        }}
      >
        <p className="text-sm">{t("codeSent", { email })}</p>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-code`}>{t("code")}</Label>
          <Input
            autoComplete="one-time-code"
            className="w-48"
            dir="ltr"
            id={`${id}-code`}
            inputMode="numeric"
            maxLength={8}
            onChange={(event) => setCode(event.target.value)}
            required
            value={code}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={confirm.isPending || code.length < 8} type="submit">
            {t("confirm")}
          </Button>
          <Button onClick={() => send.reset()} type="button" variant="ghost">
            {t("changeEmail")}
          </Button>
        </div>
        {confirm.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {errors(confirmError(confirm.error.message))}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        send.mutate({ email, locale, university });
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor={`${id}-university`}>{t("university")}</Label>
        <select
          className={selectClassName}
          id={`${id}-university`}
          onChange={(event) => setUniversity(event.target.value)}
          required
          value={university}
        >
          <option value="">{t("chooseUniversity")}</option>
          {(universities.data ?? []).map((row) => (
            <option key={row.id} value={row.id}>
              {localized(row, "name", locale)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-email`}>{t("email")}</Label>
        <Input
          autoComplete="email"
          dir="ltr"
          id={`${id}-email`}
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>
      <div>
        <Button
          disabled={send.isPending || !(email && university)}
          type="submit"
        >
          {t("sendCode")}
        </Button>
      </div>
      {send.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {errors(
            studentCodeError(
              send.error instanceof ApiError ? send.error.code : undefined
            )
          )}
        </p>
      ) : null}
    </form>
  );
};

/** A staff card or employer letter (one or two files) for review. */
const EducatorDocumentsForm = () => {
  const t = useTranslations("app.settings.verification.educator");
  const id = useId();
  const request = useRequestEducatorCheck();
  const [institution, setInstitution] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        request.mutate({ files, institution: institution.trim() });
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor={`${id}-institution`}>{t("institution")}</Label>
        <Input
          id={`${id}-institution`}
          maxLength={160}
          onChange={(event) => setInstitution(event.target.value)}
          required
          value={institution}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-files`}>{t("files")}</Label>
        <Input
          accept={ACCEPT}
          id={`${id}-files`}
          multiple
          onChange={(event) =>
            setFiles(Array.from(event.target.files ?? []).slice(0, 2))
          }
          required
          type="file"
        />
        <p className="text-muted-foreground text-xs">{t("filesNote")}</p>
      </div>
      <div>
        <Button
          disabled={
            request.isPending || files.length === 0 || !institution.trim()
          }
          type="submit"
        >
          {t("send")}
        </Button>
      </div>
      {request.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </form>
  );
};

const EducatorForms = () => {
  const t = useTranslations("app.settings.verification.educator");
  const [method, setMethod] = useState<"documents" | "email">("email");
  return (
    <div className="grid gap-4">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">{t("how")}</legend>
        {(["email", "documents"] as const).map((value) => (
          <Button
            aria-pressed={method === value}
            key={value}
            onClick={() => setMethod(value)}
            size="sm"
            type="button"
            variant={method === value ? "default" : "outline"}
          >
            {t(value === "email" ? "byEmail" : "byDocuments")}
          </Button>
        ))}
      </fieldset>
      {method === "email" ? <EducatorEmailForm /> : <EducatorDocumentsForm />}
    </div>
  );
};

const Educator = ({
  educator,
}: {
  readonly educator: MyVerifications["educator"];
}) => {
  const t = useTranslations("app.settings.verification.educator");
  const locale = useLocale() as Locale;

  let body = <EducatorForms />;
  if (educator.verified && educator.valid_until) {
    body = (
      <p className="text-sm">
        {t("verified", {
          date: formatCalendarDate(
            new Date(`${educator.valid_until}T12:00:00`),
            locale
          ),
          institution: educator.institution ?? "",
        })}
      </p>
    );
  } else if (educator.pending === "documents") {
    body = <p className="text-sm">{t("waiting")}</p>;
  }

  return (
    <section aria-labelledby="verification-educator" className="grid gap-3">
      <div>
        <h2 className="font-medium" id="verification-educator">
          {t("title")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      {!(educator.verified || educator.pending) && educator.rejected_reason ? (
        <p className="text-destructive text-sm">
          {t("rejected", { reason: educator.rejected_reason })}
        </p>
      ) : null}
      {body}
    </section>
  );
};

/**
 * /verify → Identity: the National Card and a selfie, reviewed by support;
 * needed to receive payouts, bid high or rent without a deposit.
 */
export const IdentitySection = () => {
  const status = useMyVerifications();
  return status.data ? <Identity identity={status.data.identity} /> : null;
};

/** /verify → Educator: the badge that brings every student perk. */
export const EducatorSection = () => {
  const status = useMyVerifications();
  return status.data ? <Educator educator={status.data.educator} /> : null;
};

/**
 * Pass → Settings → Verification: every verification (student, educator,
 * identity, organizations) is in one place, /verify.
 */
export const VerificationLinkCard = () => {
  const t = useTranslations("app.settings.verification");
  return (
    <Card id="verification">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheckIcon
            aria-hidden="true"
            className="size-5 text-pink-text"
          />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/verify">{t("open")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
};
