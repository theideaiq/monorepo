"use client";

import { EmailOtpForm } from "@repo/auth/components/email-otp-form";
import { useTurnstile } from "@repo/auth/components/turnstile";
import { useAuth } from "@repo/auth/provider";
import { localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { Label } from "@repo/design-system/components/ui/label";
import type { Locale } from "@repo/internationalization";
import {
  formatCalendarDate,
  formatDateTime,
} from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { encode } from "uqr";
import { CardForm, EmailForm } from "@/components/student-settings";
import { useAuthMessages } from "@/lib/auth-messages";
import {
  useBeginStudentCheck,
  useClaimStudentEmail,
  useFinishStudentCheck,
  useForgetStudentStatus,
  useMyStudent,
  useStudentCheck,
  useUniversities,
} from "@/lib/student-queries";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs";

const day = (value: string, locale: Locale) =>
  formatCalendarDate(new Date(`${value}T12:00:00`), locale);

/** "K7M2QX9P" → "K7M2-QX9P", easier to read out and type. */
const grouped = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

/** The student code as a QR (`STUDENT:<code>`), for Partners to scan. */
const CodeQr = ({ code }: { readonly code: string }) => {
  const { data, size } = useMemo(
    () => encode(`STUDENT:${code}`, { border: 1, ecc: "M" }),
    [code]
  );
  const path = data
    .flatMap((row, y) =>
      row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : ""))
    )
    .join("");
  return (
    <svg
      aria-hidden="true"
      className="size-40"
      shapeRendering="crispEdges"
      viewBox={`0 0 ${size} ${size}`}
    >
      <rect fill="#ffffff" height={size} width={size} />
      <path d={path} fill="#16131a" />
    </svg>
  );
};

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
  const t = useTranslations("pass.verify");
  const locale = useLocale();
  const id = useId();
  const universities = useUniversities();
  return (
    <div className="grid gap-2">
      <Label htmlFor={`${id}-university`}>{t("university")}</Label>
      <select
        className={selectClassName}
        id={`${id}-university`}
        onChange={(event) => onChange(event.target.value)}
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

/** Deletes "Your student status"; a bare Pass goes with it. */
const DeleteStatus = ({ onDeleted }: { readonly onDeleted: () => void }) => {
  const t = useTranslations("pass.verify");
  const { supabase } = useAuth();
  const forget = useForgetStudentStatus();
  return (
    <div className="grid gap-2 border-t pt-4">
      <Button
        disabled={forget.isPending}
        onClick={() =>
          forget.mutate(undefined, {
            onSuccess: async ({ passDeleted }) => {
              if (passDeleted) {
                await supabase.auth.signOut({ scope: "local" });
              }
              onDeleted();
            },
          })
        }
        type="button"
        variant="outline"
      >
        {t("delete")}
      </Button>
      <p className="text-muted-foreground text-xs">{t("deleteHint")}</p>
      {forget.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("errors.failed")}
        </p>
      ) : null}
    </div>
  );
};

/** The result: the status, and the code (with its QR) a partner checks. */
const Result = ({
  check,
  onDeleted,
  returnTo,
}: {
  readonly check: {
    code: string;
    code_expires_at: string;
    university_id: string;
    valid_until: string;
  };
  readonly onDeleted: () => void;
  readonly returnTo: string | null;
}) => {
  const t = useTranslations("pass.verify");
  const locale = useLocale() as Locale;
  const universityName = useUniversityName();
  return (
    <div className="grid gap-4">
      <p className="font-medium" role="status">
        {t("result.verified", {
          date: day(check.valid_until, locale),
          university: universityName(check.university_id),
        })}
      </p>
      <div className="grid justify-items-center gap-2 rounded-md border p-4">
        <p className="text-muted-foreground text-sm">{t("result.code")}</p>
        <CodeQr code={check.code} />
        <p
          className="font-mono font-semibold text-2xl tracking-widest"
          dir="ltr"
        >
          {grouped(check.code)}
        </p>
        <p className="text-center text-muted-foreground text-xs">
          {t("result.codeHint", {
            time: formatDateTime(check.code_expires_at, locale),
          })}
        </p>
      </div>
      {returnTo ? (
        <Button asChild>
          <a href={returnTo}>{t("result.continue")}</a>
        </Button>
      ) : null}
      <DeleteStatus onDeleted={onDeleted} />
    </div>
  );
};

/** Verified: just this once, or keep it for the year. */
const Choose = ({ until }: { readonly until: string }) => {
  const t = useTranslations("pass.verify.choose");
  const tErrors = useTranslations("pass.verify.errors");
  const locale = useLocale() as Locale;
  const finish = useFinishStudentCheck();
  return (
    <div className="grid gap-3">
      <p className="font-medium">{t("title")}</p>
      {([false, true] as const).map((keep) => (
        <button
          className="grid gap-1 rounded-md border p-3 text-start transition-colors hover:bg-muted disabled:opacity-50"
          disabled={finish.isPending}
          key={String(keep)}
          onClick={() => finish.mutate(keep)}
          type="button"
        >
          <span className="font-medium text-sm">
            {t(keep ? "keep" : "once")}
          </span>
          <span className="text-muted-foreground text-xs">
            {keep ? t("keepHint", { date: day(until, locale) }) : t("onceHint")}
          </span>
        </button>
      ))}
      {finish.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {tErrors(
            finish.error.message.startsWith("Too many") ? "tooMany" : "failed"
          )}
        </p>
      ) : null}
    </div>
  );
};

/**
 * Signed out: sign in with the university email (the emailed code proves
 * it), or with any email to send a student card photo.
 */
const SignedOut = ({
  turnstileSiteKey,
}: {
  readonly turnstileSiteKey?: string;
}) => {
  const t = useTranslations("pass.verify");
  const locale = useLocale();
  const { supabase } = useAuth();
  const messages = useAuthMessages();
  const turnstile = useTurnstile(turnstileSiteKey, locale);
  const claim = useClaimStudentEmail();
  const begin = useBeginStudentCheck();
  const [university, setUniversity] = useState("");
  const [byCard, setByCard] = useState(false);

  return (
    <div className="grid gap-4">
      <UniversityPicker onChange={setUniversity} value={university} />
      {university ? (
        <>
          <p className="text-muted-foreground text-sm">
            {t(byCard ? "cardEmail" : "universityEmail")}
          </p>
          <EmailOtpForm
            getCaptchaToken={turnstile.getToken}
            key={`${university}-${byCard}`}
            locale={locale}
            messages={messages}
            onSignedIn={() =>
              byCard ? begin.mutate() : claim.mutate(university)
            }
            supabase={supabase}
          />
          {turnstile.element}
          <Button
            className="justify-self-center"
            onClick={() => setByCard(!byCard)}
            type="button"
            variant="link"
          >
            {t(byCard ? "useEmail" : "useCard")}
          </Button>
        </>
      ) : null}
      {claim.isError || begin.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("errors.failed")}
        </p>
      ) : null}
    </div>
  );
};

/**
 * Signed in but not verified: the university email gets a code (the Pass
 * may have signed in with another address), or a card photo.
 */
const Unverified = ({ notUniversity }: { readonly notUniversity: boolean }) => {
  const t = useTranslations("pass.verify");
  const [university, setUniversity] = useState("");
  const [byCard, setByCard] = useState(false);
  return (
    <div className="grid gap-4">
      {notUniversity ? (
        <p className="text-sm" role="status">
          {t("notUniversityEmail")}
        </p>
      ) : null}
      <UniversityPicker onChange={setUniversity} value={university} />
      {university ? (
        <>
          {byCard ? (
            <CardForm university={university} />
          ) : (
            <EmailForm key={university} university={university} />
          )}
          <Button
            className="justify-self-center"
            onClick={() => setByCard(!byCard)}
            type="button"
            variant="link"
          >
            {t(byCard ? "useEmail" : "useCard")}
          </Button>
        </>
      ) : null}
    </div>
  );
};

/** The signed-in states: verify, choose, the result or waiting for review. */
const SignedIn = ({ returnTo }: { readonly returnTo: string | null }) => {
  const t = useTranslations("pass.verify");
  const student = useMyStudent();
  const check = useStudentCheck();
  const finish = useFinishStudentCheck();
  const [deleted, setDeleted] = useState(false);

  if (deleted) {
    return (
      <p className="text-sm" role="status">
        {t("deleted")}
      </p>
    );
  }
  if (student.isPending || check.isPending) {
    return null;
  }
  if (student.isError || check.isError) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {t("errors.failed")}
      </p>
    );
  }

  const live = finish.data ?? check.data.check;
  if (live) {
    return (
      <Result
        check={live}
        onDeleted={() => setDeleted(true)}
        returnTo={returnTo}
      />
    );
  }
  const status = student.data;
  if (status?.verified && status.valid_until) {
    // A bare Pass chooses; a full Pass keeps its badge and shows a code.
    if (check.data.bare) {
      return <Choose until={status.valid_until} />;
    }
    return (
      <div className="grid gap-3">
        <Button
          disabled={finish.isPending}
          onClick={() => finish.mutate(true)}
          type="button"
        >
          {t("result.showCode")}
        </Button>
        <DeleteStatus onDeleted={() => setDeleted(true)} />
      </div>
    );
  }
  if (status?.pending === "card") {
    return (
      <div className="grid gap-3">
        <p className="text-sm" role="status">
          {t("waiting")}
        </p>
        <DeleteStatus onDeleted={() => setDeleted(true)} />
      </div>
    );
  }
  return <Unverified notUniversity={check.data.bare} />;
};

interface StudentCheckProps {
  readonly returnTo: string | null;
  readonly turnstileSiteKey?: string;
}

/**
 * theideaiq.com/verify, "Verify you're a student": the university and its
 * email, then the emailed code; or a student card photo. Nothing else is
 * asked. The result is a code (and QR) partners check, or the
 * `student_check` answer a partner's site asked for.
 */
export const StudentCheck = ({
  returnTo,
  turnstileSiteKey,
}: StudentCheckProps) => {
  const t = useTranslations("pass.verify");
  const { user } = useAuth();
  return (
    <div className="grid gap-6">
      <div className="grid gap-1 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      {user ? (
        <SignedIn returnTo={returnTo} />
      ) : (
        <SignedOut turnstileSiteKey={turnstileSiteKey} />
      )}
    </div>
  );
};
