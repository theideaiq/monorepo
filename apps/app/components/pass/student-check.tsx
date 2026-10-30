"use client";

import { EmailOtpForm } from "@repo/auth/components/email-otp-form";
import { useTurnstile } from "@repo/auth/components/turnstile";
import { useAuth } from "@repo/auth/provider";
import { localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { Label } from "@repo/design-system/components/ui/label";
import { type Locale, localePath } from "@repo/internationalization";
import { formatCalendarDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { VerificationHub } from "@/components/pass/verification-hub";
import { CardForm, EmailForm } from "@/components/student-settings";
import { useAuthMessages } from "@/lib/auth-messages";
import {
  useBeginStudentCheck,
  useClaimStudentEmail,
  useForgetStudentStatus,
  useMyStudent,
  useStudentCheck,
  useUniversities,
} from "@/lib/student-queries";
import type { VerifyKind } from "@/lib/verify-kinds";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs";

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

/** Verified: the status until 30 June, and back to where they came from. */
const Verified = ({
  onDeleted,
  returnTo,
  universityId,
  until,
}: {
  readonly onDeleted: () => void;
  readonly returnTo: string | null;
  readonly universityId: string | null;
  readonly until: string;
}) => {
  const t = useTranslations("pass.verify");
  const locale = useLocale() as Locale;
  const universityName = useUniversityName();
  return (
    <div className="grid gap-4">
      <p className="font-medium" role="status">
        {t("result.verified", {
          date: day(until, locale),
          university: universityName(universityId),
        })}
      </p>
      {returnTo ? (
        <Button asChild>
          <a href={returnTo}>{t("result.continue")}</a>
        </Button>
      ) : null}
      <DeleteStatus onDeleted={onDeleted} />
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

/** The signed-in states: verify, verified, or waiting for review. */
const SignedIn = ({ returnTo }: { readonly returnTo: string | null }) => {
  const t = useTranslations("pass.verify");
  const student = useMyStudent();
  const check = useStudentCheck();
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

  const status = student.data;
  if (status?.verified && status.valid_until) {
    return (
      <Verified
        onDeleted={() => setDeleted(true)}
        returnTo={returnTo}
        universityId={status.university_id}
        until={status.valid_until}
      />
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
  /** Which verification to open for a full Pass (`?kind=`). */
  readonly kind: VerifyKind;
  /** Partners → Organization, where organizations are verified. */
  readonly partnersUrl: string;
  readonly returnTo: string | null;
  readonly turnstileSiteKey?: string;
}

/**
 * theideaiq.com/verify. Signed out, or with a bare Pass: "Verify you're a
 * student", the university and its email, then the emailed code, or a
 * student card photo; nothing else is asked, and the result is The IDEA's
 * student badge until 30 June. With a full Pass: every verification
 * (student, educator, identity, organizations) in one place. Partners'
 * own verifications are at /verify/<id>.
 */
export const StudentCheck = ({
  kind,
  partnersUrl,
  returnTo,
  turnstileSiteKey,
}: StudentCheckProps) => {
  const t = useTranslations("pass.verify");
  const locale = useLocale();
  const { user } = useAuth();
  const check = useStudentCheck();
  // A full Pass verifies everything here; a bare one holds only the badge.
  if (user && check.isPending) {
    return null;
  }
  if (user && check.data && !check.data.bare) {
    return (
      <VerificationHub
        kind={kind}
        partnersUrl={partnersUrl}
        returnTo={returnTo}
      />
    );
  }
  return (
    <div className="grid gap-6">
      <div className="grid gap-1 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      {user ? (
        <SignedIn returnTo={returnTo} />
      ) : (
        <>
          <SignedOut turnstileSiteKey={turnstileSiteKey} />
          <p className="text-center text-muted-foreground text-sm">
            <Link
              className="underline"
              href={{
                pathname: "/sign-in",
                query: {
                  return_to: localePath(locale, `/verify?kind=${kind}`),
                },
              }}
            >
              {t("otherKinds")}
            </Link>
          </p>
        </>
      )}
    </div>
  );
};
