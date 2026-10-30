"use client";

import { createClient } from "@repo/auth/client";
import { Button } from "@repo/design-system/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@repo/design-system/components/ui/input-otp";
import { Label } from "@repo/design-system/components/ui/label";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { localePath } from "@repo/internationalization";
import { useLocale, useTranslations } from "next-intl";
import {
  type FormEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

const CODE_LENGTH = 6;
const CODE_SLOTS = Array.from({ length: CODE_LENGTH }, (_, index) => index);

type Problem = "invalidCode" | "unavailable";

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

interface MfaFormProps {
  /** A verified authenticator factor; null means it must be set up first. */
  readonly factorId: string | null;
  /** An allowed return_to (a path on this site or a URL), or null for Your Pass. */
  readonly returnTo: string | null;
}

/**
 * Links an authenticator app (TOTP) the first time, then checks its code,
 * which raises the session to AAL2 in the shared cookie.
 */
export const MfaForm = ({ factorId, returnTo }: MfaFormProps) => {
  const t = useTranslations("pass.mfa");
  const locale = useLocale();
  const id = useId();
  const supabase = useMemo(() => createClient(), []);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (factorId || started.current) {
      return;
    }
    started.current = true;

    const enroll = async () => {
      // Drop set-ups that were started but never confirmed.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      await Promise.all(
        (factors?.all ?? [])
          .filter(
            (factor) =>
              factor.factor_type === "totp" && factor.status !== "verified"
          )
          .map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id }))
      );

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `the-idea-pass-${Date.now()}`,
      });
      if (error || !data) {
        setProblem("unavailable");
        return;
      }
      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    };

    enroll();
  }, [factorId, supabase]);

  const target = factorId ?? enrollment?.factorId ?? null;

  const verify = async (token: string) => {
    if (!target || token.length !== CODE_LENGTH) {
      return;
    }
    setPending(true);
    setProblem(null);

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      code: token,
      factorId: target,
    });

    if (error) {
      setPending(false);
      setCode("");
      setProblem("invalidCode");
      return;
    }

    // A full navigation, so the next site reads the upgraded session.
    window.location.assign(returnTo ?? localePath(locale, "/pass"));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await verify(code);
  };

  if (!(factorId || enrollment || problem)) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
      {enrollment ? (
        <div className="grid gap-3">
          <ol className="list-decimal space-y-1 ps-5 text-muted-foreground text-sm">
            <li>{t("stepInstall")}</li>
            <li>{t("stepScan")}</li>
            <li>{t("stepCode")}</li>
          </ol>
          {/* The QR code is an SVG data URI from Supabase Auth. */}
          {/* biome-ignore lint/performance/noImgElement: data URI, nothing to optimize */}
          <img
            alt={t("qrAlt")}
            className="mx-auto size-48 rounded-md bg-white p-2"
            height={192}
            src={enrollment.qrCode}
            width={192}
          />
          <div className="grid gap-1 text-center">
            <span className="text-muted-foreground text-xs">
              {t("secretLabel")}
            </span>
            <code
              className="select-all break-all rounded bg-muted px-2 py-1 font-mono text-sm"
              dir="ltr"
            >
              {enrollment.secret}
            </code>
          </div>
        </div>
      ) : null}

      {target ? (
        <div className="grid gap-2">
          <Label htmlFor={`${id}-code`}>{t("codeLabel")}</Label>
          <div className="flex justify-center" dir="ltr">
            <InputOTP
              autoComplete="one-time-code"
              autoFocus
              disabled={pending}
              id={`${id}-code`}
              inputMode="numeric"
              maxLength={CODE_LENGTH}
              onChange={setCode}
              onComplete={verify}
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
        </div>
      ) : null}

      {problem ? (
        <p className="text-center text-destructive text-sm" role="alert">
          {t(`errors.${problem}`)}
        </p>
      ) : null}

      {target ? (
        <Button disabled={pending || code.length !== CODE_LENGTH} type="submit">
          {pending ? t("verifying") : t("verify")}
        </Button>
      ) : null}
    </form>
  );
};
