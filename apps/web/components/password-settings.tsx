"use client";

import {
  MIN_PASSWORD_LENGTH,
  type PasswordErrorCode,
  passwordProblem,
  sendReauthenticationCode,
  setPassword,
} from "@repo/auth/password";
import { useAuth } from "@repo/auth/provider";
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
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";

const CODE = /^\d{6,8}$/;

/**
 * Your Pass → Settings: set or change the password (people who signed up
 * with a code alone add one here). On an older session Supabase asks for a
 * code first, emailed to the Pass's address.
 */
export const PasswordSettingsCard = () => {
  const t = useTranslations("app.settings.password");
  const tErrors = useTranslations("auth.password.errors");
  const id = useId();
  const { supabase, user } = useAuth();
  const [password, setPasswordValue] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState<PasswordErrorCode | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user?.email) {
    return null;
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await setPassword(
      supabase,
      password,
      needsCode ? code : undefined
    );
    if (result.ok) {
      setPending(false);
      setSaved(true);
      setPasswordValue("");
      setCode("");
      setNeedsCode(false);
      return;
    }
    if (result.code === "reauthentication_needed" && !needsCode) {
      const sent = await sendReauthenticationCode(supabase);
      setPending(false);
      if (sent.ok) {
        setNeedsCode(true);
        return;
      }
      setError(sent.code);
      return;
    }
    setPending(false);
    setError(result.code);
  };

  const weak = password.length > 0 && passwordProblem(password) !== null;

  return (
    <Card id="password">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" noValidate onSubmit={save}>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-password`}>{t("label")}</Label>
            <Input
              aria-describedby={`${id}-hint`}
              autoComplete="new-password"
              className="text-start"
              dir="ltr"
              id={`${id}-password`}
              minLength={MIN_PASSWORD_LENGTH}
              onChange={(event) => setPasswordValue(event.target.value)}
              type="password"
              value={password}
            />
            <p className="text-muted-foreground text-xs" id={`${id}-hint`}>
              {t("hint")}
            </p>
          </div>
          {needsCode ? (
            <div className="grid gap-2">
              <Label htmlFor={`${id}-code`}>{t("codeLabel")}</Label>
              <p className="text-muted-foreground text-sm">
                {t("codeSent", { email: user.email })}
              </p>
              <Input
                autoComplete="one-time-code"
                className="w-40 text-start"
                dir="ltr"
                id={`${id}-code`}
                inputMode="numeric"
                maxLength={8}
                onChange={(event) => setCode(event.target.value.trim())}
                value={code}
              />
            </div>
          ) : null}
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {tErrors(error)}
            </p>
          ) : null}
          {saved ? (
            <p className="text-muted-foreground text-sm" role="status">
              {t("saved")}
            </p>
          ) : null}
          <Button
            className="justify-self-start"
            disabled={
              pending || !password || weak || (needsCode && !CODE.test(code))
            }
            type="submit"
          >
            {pending ? t("saving") : t("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
