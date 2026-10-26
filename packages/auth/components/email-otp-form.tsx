"use client";

import type { Database } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@repo/design-system/components/ui/input-otp";
import { Label } from "@repo/design-system/components/ui/label";
import { localePath } from "@repo/internationalization";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { createClient } from "../client";
import { type AuthMessages, defaultAuthMessages, format } from "../messages";
import {
  EMAIL_CODE_LENGTH,
  normalizeEmail,
  type OtpErrorCode,
  sendEmailOtp,
  verifyEmailOtp,
} from "../otp";

const RESEND_AFTER_SECONDS = 60;

/** The app's sign-in link landing page, for emails that carry a link. */
const callbackUrl = (locale: string | undefined) =>
  typeof window === "undefined"
    ? undefined
    : new URL(
        locale ? localePath(locale, "/auth/callback") : "/auth/callback",
        window.location.origin
      ).toString();
const CODE_SLOTS = Array.from(
  { length: EMAIL_CODE_LENGTH },
  (_, index) => index
);

type FormError = OtpErrorCode | "name_required";

interface EmailOtpFormProps {
  /** Ask for a display name (sign-up). */
  readonly collectName?: boolean;
  /** Returns a Turnstile/hCaptcha token when CAPTCHA protection is enabled. */
  readonly getCaptchaToken?: () => Promise<string | undefined>;
  /** Stored on new accounts as their preferred language. */
  readonly locale?: string;
  readonly messages?: AuthMessages;
  /**
   * Shown under the "no account" error when `shouldCreateUser` is false,
   * e.g. a link to sign up with the address that was typed.
   */
  readonly noAccount?: (email: string) => ReactNode;
  /** Called after sign-in instead of navigating to `redirectTo`. */
  /** `isNew`: the code created the Pass (a sign-up). */
  readonly onSignedIn?: (userId: string, isNew: boolean) => void;
  readonly redirectTo?: string;
  /** false: sign in to existing accounts only (no sign-up). */
  readonly shouldCreateUser?: boolean;
  /** Defaults to the browser client. */
  readonly supabase?: SupabaseClient<Database>;
}

const getSubmitLabel = (
  step: "email" | "code",
  pending: boolean,
  messages: AuthMessages
) => {
  if (step === "email") {
    return pending ? messages.sending : messages.continue;
  }
  return pending ? messages.verifying : messages.verify;
};

/**
 * Passwordless sign-in and sign-up with an 8-digit code sent by email (no
 * links, which break inside the iOS/Android apps): the address, then the
 * code, with resend after a cooldown and a way back to change the address.
 */
export const EmailOtpForm = ({
  collectName = false,
  getCaptchaToken,
  locale,
  messages = defaultAuthMessages,
  noAccount,
  onSignedIn,
  redirectTo = "/",
  shouldCreateUser = true,
  supabase: providedClient,
}: EmailOtpFormProps) => {
  const id = useId();
  const router = useRouter();
  const supabase = useMemo(
    () => providedClient ?? createClient(),
    [providedClient]
  );
  const [step, setStep] = useState<"email" | "code">("email");
  const [fullName, setFullName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [email, setEmail] = useState("");
  const [sentAt, setSentAt] = useState(0);
  const [code, setCode] = useState("");
  const [error, setError] = useState<FormError | null>(null);
  const [pending, setPending] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) {
      return;
    }
    const timer = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const sendCode = async () => {
    if (collectName && !fullName.trim()) {
      setError("name_required");
      return;
    }
    // Checked here too, so a typo doesn't cost a request.
    if (!normalizeEmail(emailInput)) {
      setError("invalid_email");
      return;
    }

    setPending(true);
    setError(null);

    const result = await sendEmailOtp(supabase, emailInput, {
      captchaToken: await getCaptchaToken?.(),
      emailRedirectTo: callbackUrl(locale),
      fullName: collectName ? fullName : undefined,
      locale,
      shouldCreateUser,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.code);
      return;
    }

    setEmail(result.email);
    setSentAt(Date.now());
    setCode("");
    setStep("code");
    setResendIn(RESEND_AFTER_SECONDS);
  };

  const verifyCode = async (token: string) => {
    setPending(true);
    setError(null);

    const result = await verifyEmailOtp(supabase, email, token, { sentAt });

    if (!result.ok) {
      setPending(false);
      setError(result.code);
      setCode("");
      return;
    }

    if (onSignedIn) {
      onSignedIn(result.value.userId, result.value.isNew);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (step === "email") {
      await sendCode();
    } else if (code.length === EMAIL_CODE_LENGTH) {
      await verifyCode(code);
    }
  };

  let errorText: string | null = null;
  if (error === "name_required") {
    errorText = messages.nameRequired;
  } else if (error) {
    errorText = messages.errors[error];
  }
  const emailInvalid = step === "email" && error === "invalid_email";
  const nameInvalid = error === "name_required";

  return (
    <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
      {step === "email" ? (
        <>
          {collectName ? (
            <div className="grid gap-2">
              <Label htmlFor={`${id}-name`}>{messages.fullNameLabel}</Label>
              <Input
                aria-invalid={nameInvalid || undefined}
                autoComplete="name"
                id={`${id}-name`}
                onChange={(event) => setFullName(event.target.value)}
                required
                value={fullName}
              />
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor={`${id}-email`}>{messages.emailLabel}</Label>
            {/* Addresses read left-to-right in Arabic too. */}
            <Input
              aria-describedby={`${id}-email-hint`}
              aria-invalid={emailInvalid || undefined}
              autoCapitalize="none"
              autoComplete="email"
              className="text-start"
              dir="ltr"
              id={`${id}-email`}
              inputMode="email"
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder={messages.emailPlaceholder}
              required
              spellCheck={false}
              type="email"
              value={emailInput}
            />
            <p
              className="text-muted-foreground text-sm"
              id={`${id}-email-hint`}
            >
              {messages.emailHint}
            </p>
          </div>
        </>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor={`${id}-code`}>{messages.codeLabel}</Label>
          <p className="text-muted-foreground text-sm">
            {format(messages.emailCodeSentTo, { email })}
          </p>
          <div className="flex justify-center" dir="ltr">
            <InputOTP
              aria-describedby={`${id}-code-hint`}
              autoComplete="one-time-code"
              autoFocus
              disabled={pending}
              id={`${id}-code`}
              inputMode="numeric"
              maxLength={EMAIL_CODE_LENGTH}
              onChange={setCode}
              onComplete={verifyCode}
              pattern="^[0-9]+$"
              value={code}
            >
              <InputOTPGroup>
                {CODE_SLOTS.map((slot) => (
                  <InputOTPSlot index={slot} key={slot} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <p
            className="text-center text-muted-foreground text-xs"
            id={`${id}-code-hint`}
          >
            {messages.codeHint}
          </p>
        </div>
      )}

      {errorText ? (
        <div className="grid gap-1" role="alert">
          <p className="text-destructive text-sm">{errorText}</p>
          {error === "no_account" && noAccount
            ? noAccount(normalizeEmail(emailInput) ?? "")
            : null}
        </div>
      ) : null}

      <Button disabled={pending} type="submit">
        {getSubmitLabel(step, pending, messages)}
      </Button>

      {step === "code" ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <Button
            onClick={() => {
              setStep("email");
              setError(null);
              setCode("");
            }}
            type="button"
            variant="link"
          >
            {messages.changeEmail}
          </Button>
          <Button
            disabled={pending || resendIn > 0}
            onClick={sendCode}
            type="button"
            variant="link"
          >
            {resendIn > 0
              ? format(messages.resendIn, { seconds: resendIn })
              : messages.resend}
          </Button>
        </div>
      ) : null}
    </form>
  );
};
