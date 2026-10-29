"use client";

import { useAuth } from "@repo/auth/provider";
import { localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { formatCalendarDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { SectionSpinner } from "@/components/states";
import { ApiError } from "@/lib/api";
import {
  returnToPartner,
  useConfirmVerificationCode,
  useSendVerificationCode,
  useSendVerificationDocument,
  useShareVerification,
  useVerificationPage,
  type VerificationPage,
} from "@/lib/partner-verification";
import { useUniversities } from "@/lib/student-queries";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs";

const CODE = /^\d{8}$/;

const ERRORS = new Set([
  "code_expired",
  "email_unavailable",
  "invalid_file",
  "no_badge",
  "not_found",
  "not_university",
  "too_many",
  "wrong_code",
]);

type ErrorKey =
  | "code_expired"
  | "email_unavailable"
  | "failed"
  | "invalid_file"
  | "no_badge"
  | "not_found"
  | "not_university"
  | "too_many"
  | "wrong_code";

const errorKey = (error: unknown): ErrorKey =>
  error instanceof ApiError && ERRORS.has(error.code)
    ? (error.code as ErrorKey)
    : "failed";

const Failure = ({ error }: { readonly error: unknown }) => {
  const t = useTranslations("pass.partnerVerify.errors");
  return error ? (
    <p className="text-destructive text-sm" role="alert">
      {t(errorKey(error))}
    </p>
  ) : null;
};

const day = (value: string, locale: Locale) =>
  formatCalendarDate(new Date(`${value}T12:00:00`), locale);

const useUniversityName = () => {
  const locale = useLocale();
  const universities = useUniversities();
  return (id: string | null | undefined) => {
    const row = universities.data?.find((u) => u.id === id);
    return row ? localized(row, "name", locale) : "";
  };
};

const UniversityPicker = ({
  onChange,
  value,
}: {
  readonly onChange: (value: string) => void;
  readonly value: string;
}) => {
  const t = useTranslations("pass.partnerVerify");
  const locale = useLocale();
  const id = useId();
  const universities = useUniversities();
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{t("university")}</Label>
      <select
        className={selectClassName}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        required
        value={value}
      >
        <option value="">{t("chooseUniversity")}</option>
        {(universities.data ?? []).map((row) => (
          <option key={row.id} value={row.id}>
            {localized(row, "name", locale)}
          </option>
        ))}
      </select>
    </div>
  );
};

/** One tap: a signed-in Pass holder with a valid badge shares it. */
const ShareCard = ({
  onElsewhere,
  page,
}: {
  readonly onElsewhere: () => void;
  readonly page: VerificationPage;
}) => {
  const t = useTranslations("pass.partnerVerify");
  const locale = useLocale() as Locale;
  const universityName = useUniversityName();
  const share = useShareVerification(page.id, locale);
  const { badge } = page;
  if (!badge) {
    return null;
  }
  return (
    <div className="grid gap-3">
      <p className="font-medium">
        {t("share.question", { partner: page.partner })}
      </p>
      <p className="text-muted-foreground text-sm">
        {t("share.what", {
          date: day(badge.valid_until, locale),
          university: universityName(badge.university),
        })}
      </p>
      <Button
        disabled={share.isPending}
        onClick={() => share.mutate()}
        type="button"
      >
        {t("share.yes")}
      </Button>
      <Button onClick={onElsewhere} type="button" variant="outline">
        {t("share.other")}
      </Button>
      <Failure error={share.error} />
    </div>
  );
};

/** The university email, then the emailed 8-digit code. */
const EmailFlow = ({ page }: { readonly page: VerificationPage }) => {
  const t = useTranslations("pass.partnerVerify.email");
  const locale = useLocale();
  const id = useId();
  const send = useSendVerificationCode(page.id, locale);
  const confirm = useConfirmVerificationCode(page.id, locale);
  const [university, setUniversity] = useState(page.university ?? "");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const sent = send.isSuccess || page.code_sent;

  const sendCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send.mutate({ email, university });
  };
  const confirmCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (CODE.test(code)) {
      confirm.mutate(code);
    }
  };

  if (sent) {
    return (
      <form className="grid gap-3" onSubmit={confirmCode}>
        <Label htmlFor={`${id}-code`}>{t("code")}</Label>
        <Input
          autoComplete="one-time-code"
          dir="ltr"
          id={`${id}-code`}
          inputMode="numeric"
          maxLength={8}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          value={code}
        />
        <Button disabled={confirm.isPending || !CODE.test(code)} type="submit">
          {t("verify")}
        </Button>
        <Button
          disabled={send.isPending}
          onClick={() => {
            confirm.reset();
            send.reset();
          }}
          type="button"
          variant="link"
        >
          {t("again")}
        </Button>
        <Failure error={confirm.error} />
      </form>
    );
  }
  return (
    <form className="grid gap-3" onSubmit={sendCode}>
      <UniversityPicker onChange={setUniversity} value={university} />
      <div className="grid gap-2">
        <Label htmlFor={`${id}-email`}>{t("label")}</Label>
        <Input
          autoComplete="email"
          dir="ltr"
          id={`${id}-email`}
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
        <p className="text-muted-foreground text-xs">{t("hint")}</p>
      </div>
      <Button disabled={send.isPending || !university} type="submit">
        {t("send")}
      </Button>
      <Failure error={send.error} />
    </form>
  );
};

/** A student card or enrollment proof, checked by Staff. */
const DocumentFlow = ({ page }: { readonly page: VerificationPage }) => {
  const t = useTranslations("pass.partnerVerify.document");
  const locale = useLocale();
  const id = useId();
  const upload = useSendVerificationDocument(page.id, locale);
  const [university, setUniversity] = useState("");
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<"card" | "enrollment">("card");
  const [file, setFile] = useState<File | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (file) {
      upload.mutate({ email, file, kind, university });
    }
  };
  return (
    <form className="grid gap-3" onSubmit={submit}>
      <UniversityPicker onChange={setUniversity} value={university} />
      <div className="grid gap-2">
        <Label htmlFor={`${id}-kind`}>{t("kind")}</Label>
        <select
          className={selectClassName}
          id={`${id}-kind`}
          onChange={(event) =>
            setKind(event.target.value as "card" | "enrollment")
          }
          value={kind}
        >
          <option value="card">{t("card")}</option>
          <option value="enrollment">{t("enrollment")}</option>
        </select>
        <p className="text-muted-foreground text-xs">{t("kindHint")}</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-file`}>{t("file")}</Label>
        <Input
          accept="image/png,image/jpeg,image/webp,application/pdf"
          id={`${id}-file`}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          required
          type="file"
        />
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
        <p className="text-muted-foreground text-xs">{t("emailHint")}</p>
      </div>
      <Button
        disabled={upload.isPending || !(university && file)}
        type="submit"
      >
        {t("send")}
      </Button>
      <Failure error={upload.error} />
    </form>
  );
};

/** Verified, waiting for Staff, or not accepted: back to the partner. */
const Finished = ({ page }: { readonly page: VerificationPage }) => {
  const t = useTranslations("pass.partnerVerify.done");
  const locale = useLocale() as Locale;
  const universityName = useUniversityName();
  let text = t("pending");
  if (page.status === "verified" && page.valid_until) {
    text = t("verified", {
      date: day(page.valid_until, locale),
      partner: page.partner,
      university: universityName(page.university),
    });
  } else if (page.status === "rejected") {
    text = page.reject_reason
      ? t("rejectedWith", { reason: page.reject_reason })
      : t("rejected");
  }
  return (
    <div className="grid gap-4">
      <p className="font-medium" role="status">
        {text}
      </p>
      <Button onClick={() => returnToPartner(page)} type="button">
        {t("back", { partner: page.partner })}
      </Button>
    </div>
  );
};

/** Not yet verified: one tap, or the university email, or a document. */
const Started = ({
  embedded,
  page,
}: {
  readonly embedded: boolean;
  readonly page: VerificationPage;
}) => {
  const t = useTranslations("pass.partnerVerify");
  const { user } = useAuth();
  const [byDocument, setByDocument] = useState(false);
  const [elsewhere, setElsewhere] = useState(false);

  if (page.badge && !elsewhere) {
    return <ShareCard onElsewhere={() => setElsewhere(true)} page={page} />;
  }
  return (
    <div className="grid gap-4">
      {user || embedded ? null : (
        <p className="rounded-md border bg-surface-raised p-3 text-sm">
          {t("signInPrompt")}{" "}
          <Link
            className="font-medium text-pink-text underline"
            href={{
              pathname: "/sign-in",
              query: { return_to: `/verify/${page.id}` },
            }}
          >
            {t("signIn")}
          </Link>
        </p>
      )}
      {byDocument ? <DocumentFlow page={page} /> : <EmailFlow page={page} />}
      <Button
        className="justify-self-center"
        onClick={() => setByDocument(!byDocument)}
        type="button"
        variant="link"
      >
        {t(byDocument ? "useEmail" : "useDocument")}
      </Button>
    </div>
  );
};

/**
 * theideaiq.com/verify/<id>: a partner's student verification. No Pass is
 * needed; a Pass holder with a valid badge shares it in one tap. When it's
 * done, the student goes back to the partner (redirect, popup or frame).
 * Only the status, the university and the expiry date reach the partner.
 */
export const PartnerVerification = ({
  embedded,
  id,
}: {
  readonly embedded: boolean;
  readonly id: string;
}) => {
  const t = useTranslations("pass.partnerVerify");
  const page = useVerificationPage(id);

  let body = <SectionSpinner />;
  if (page.isError || (page.isSuccess && !page.data)) {
    body = (
      <p className="text-muted-foreground text-sm" role="status">
        {t("notFound")}
      </p>
    );
  } else if (page.data) {
    body =
      page.data.status === "started" ? (
        <Started embedded={embedded} page={page.data} />
      ) : (
        <Finished page={page.data} />
      );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">{t("title")}</h1>
        {page.data ? (
          <p className="text-muted-foreground text-sm">
            {t("description", { partner: page.data.partner })}
          </p>
        ) : null}
      </div>
      {body}
      <p className="text-center text-muted-foreground text-xs">
        {t("privacy")}{" "}
        <Link className="underline" href="/legal/privacy">
          {t("privacyLink")}
        </Link>
      </p>
    </div>
  );
};
