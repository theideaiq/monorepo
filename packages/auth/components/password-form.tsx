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
import type { SupabaseClient } from "@supabase/supabase-js";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { format } from "../messages";
import { EMAIL_CODE_LENGTH } from "../otp";
import {
  confirmSignUp,
  MIN_PASSWORD_LENGTH,
  type PasswordErrorCode,
  passwordProblem,
  resetPassword,
  sendPasswordReset,
  signInWithPassword,
  signUpWithPassword,
} from "../password";

/** Texts for the password forms (the website passes translations). */
export interface PasswordMessages {
  back: string;
  codeHint: string;
  codeLabel: string;
  codeSentTo: string;
  confirm: string;
  createPass: string;
  emailLabel: string;
  errors: Record<PasswordErrorCode | "name_required", string>;
  forgot: string;
  forgotHint: string;
  fullNameLabel: string;
  haveOne: string;
  newHere: string;
  newPassword: string;
  passwordHint: string;
  passwordLabel: string;
  resetDone: string;
  resetTitle: string;
  sendCode: string;
  setPassword: string;
  signIn: string;
  signUpTitle: string;
  useCode: string;
  working: string;
}

type Mode = "signIn" | "signUp" | "confirm" | "forgot" | "reset";

interface PasswordFormProps {
  readonly getCaptchaToken?: () => Promise<string | undefined>;
  readonly initialMode?: "signIn" | "signUp";
  readonly locale?: string;
  readonly messages: PasswordMessages;
  /** `isNew`: the person just got their Pass. */
  readonly onSignedIn: (userId: string, isNew: boolean) => void;
  /** Switches to signing in with an emailed code instead. */
  readonly onUseCode?: () => void;
  readonly supabase: SupabaseClient<Database>;
}

const CODE_SLOTS = Array.from(
  { length: EMAIL_CODE_LENGTH },
  (_, index) => index
);

const CodeField = ({
  disabled,
  email,
  messages,
  onChange,
  value,
}: {
  readonly disabled: boolean;
  readonly email: string;
  readonly messages: PasswordMessages;
  readonly onChange: (value: string) => void;
  readonly value: string;
}) => {
  const id = useId();
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{messages.codeLabel}</Label>
      <p className="text-muted-foreground text-sm">
        {format(messages.codeSentTo, { email })}
      </p>
      <div className="flex justify-center" dir="ltr">
        <InputOTP
          autoComplete="one-time-code"
          autoFocus
          disabled={disabled}
          id={id}
          inputMode="numeric"
          maxLength={EMAIL_CODE_LENGTH}
          onChange={onChange}
          pattern="^[0-9]+$"
          value={value}
        >
          <InputOTPGroup>
            {CODE_SLOTS.map((slot) => (
              <InputOTPSlot index={slot} key={slot} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <p className="text-center text-muted-foreground text-xs">
        {messages.codeHint}
      </p>
    </div>
  );
};

const Field = ({
  autoComplete,
  hint,
  label,
  onChange,
  type = "text",
  value,
}: {
  readonly autoComplete: string;
  readonly hint?: string;
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly type?: "email" | "password" | "text";
  readonly value: string;
}) => {
  const id = useId();
  const ltr = type !== "text";
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        aria-describedby={hint ? `${id}-hint` : undefined}
        autoCapitalize={ltr ? "none" : undefined}
        autoComplete={autoComplete}
        className={ltr ? "text-start" : undefined}
        dir={ltr ? "ltr" : undefined}
        id={id}
        inputMode={type === "email" ? "email" : undefined}
        minLength={type === "password" ? MIN_PASSWORD_LENGTH : undefined}
        onChange={(event) => onChange(event.target.value)}
        required
        spellCheck={false}
        type={type}
        value={value}
      />
      {hint ? (
        <p className="text-muted-foreground text-xs" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
};

const LinkButton = ({
  children,
  onClick,
}: {
  readonly children: ReactNode;
  readonly onClick: () => void;
}) => (
  <Button className="h-auto p-0" onClick={onClick} type="button" variant="link">
    {children}
  </Button>
);

const SUBMIT_LABELS: Record<Mode, keyof PasswordMessages> = {
  confirm: "confirm",
  forgot: "sendCode",
  reset: "setPassword",
  signIn: "signIn",
  signUp: "createPass",
};

/** The links under the form: forgot, a code instead, sign up or back. */
const ModeLinks = ({
  go,
  messages,
  mode,
  onUseCode,
}: {
  readonly go: (mode: Mode) => void;
  readonly messages: PasswordMessages;
  readonly mode: Mode;
  readonly onUseCode?: () => void;
}) => {
  if (mode !== "signIn") {
    return (
      <div className="grid gap-2 text-sm">
        <LinkButton onClick={() => go("signIn")}>{messages.back}</LinkButton>
        {mode === "signUp" ? (
          <p className="text-center">
            {messages.haveOne}{" "}
            <LinkButton onClick={() => go("signIn")}>
              {messages.signIn}
            </LinkButton>
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="grid gap-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <LinkButton onClick={() => go("forgot")}>{messages.forgot}</LinkButton>
        {onUseCode ? (
          <LinkButton onClick={onUseCode}>{messages.useCode}</LinkButton>
        ) : null}
      </div>
      <p className="text-center">
        {messages.newHere}{" "}
        <LinkButton onClick={() => go("signUp")}>
          {messages.createPass}
        </LinkButton>
      </p>
    </div>
  );
};

interface FieldsState {
  code: string;
  email: string;
  name: string;
  password: string;
  pending: boolean;
  sentTo: string;
}

/** The fields each step shows. */
const ModeFields = ({
  messages,
  mode,
  set,
  state,
}: {
  readonly messages: PasswordMessages;
  readonly mode: Mode;
  readonly set: {
    code: (value: string) => void;
    email: (value: string) => void;
    name: (value: string) => void;
    password: (value: string) => void;
  };
  readonly state: FieldsState;
}) => {
  const asksEmail = mode === "signIn" || mode === "signUp" || mode === "forgot";
  const asksPassword =
    mode === "signIn" || mode === "signUp" || mode === "reset";
  return (
    <>
      {mode === "signUp" ? (
        <p className="font-medium text-sm">{messages.signUpTitle}</p>
      ) : null}
      {mode === "forgot" || mode === "reset" ? (
        <p className="font-medium text-sm">{messages.resetTitle}</p>
      ) : null}
      {mode === "signUp" ? (
        <Field
          autoComplete="name"
          label={messages.fullNameLabel}
          onChange={set.name}
          value={state.name}
        />
      ) : null}
      {asksEmail ? (
        <Field
          autoComplete="email"
          hint={mode === "forgot" ? messages.forgotHint : undefined}
          label={messages.emailLabel}
          onChange={set.email}
          type="email"
          value={state.email}
        />
      ) : null}
      {mode === "confirm" || mode === "reset" ? (
        <CodeField
          disabled={state.pending}
          email={state.sentTo}
          messages={messages}
          onChange={set.code}
          value={state.code}
        />
      ) : null}
      {asksPassword ? (
        <Field
          autoComplete={mode === "signIn" ? "current-password" : "new-password"}
          hint={mode === "signIn" ? undefined : messages.passwordHint}
          label={
            mode === "reset" ? messages.newPassword : messages.passwordLabel
          }
          onChange={set.password}
          type="password"
          value={state.password}
        />
      ) : null}
    </>
  );
};

/** Whether the step's submit button can be pressed. */
const canSubmit = (mode: Mode, state: FieldsState) => {
  if (state.pending) {
    return false;
  }
  const weak =
    (mode === "signUp" || mode === "reset") &&
    state.password.length > 0 &&
    passwordProblem(state.password) !== null;
  const codeMissing =
    (mode === "confirm" || mode === "reset") &&
    state.code.length !== EMAIL_CODE_LENGTH;
  return !(weak || codeMissing || (mode === "reset" && !state.password));
};

type Outcome =
  | { email: string; ok: true; value: unknown }
  | { code: PasswordErrorCode; ok: false };

/**
 * The Pass's email-and-password forms: sign in (the default), get a Pass
 * (name, email, password, then one emailed code) and reset a forgotten
 * password (an emailed code, then the new password). Links switch to
 * signing in with an emailed code instead.
 */
export const PasswordForm = ({
  getCaptchaToken,
  initialMode = "signIn",
  locale,
  messages,
  onSignedIn,
  onUseCode,
  supabase,
}: PasswordFormProps) => {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState<
    PasswordErrorCode | "name_required" | null
  >(null);
  const [pending, setPending] = useState(false);
  const state: FieldsState = { code, email, name, password, pending, sentTo };

  const go = (next: Mode) => {
    setMode(next);
    setError(null);
    setCode("");
  };
  const captcha = async () => (await getCaptchaToken?.()) ?? undefined;
  const signedIn =
    (isNew: boolean) =>
    ({ value }: { value: unknown }) =>
      onSignedIn((value as { userId: string }).userId, isNew);
  const codeSent =
    (next: Mode) =>
    ({ email: address }: { email: string }) => {
      setSentTo(address);
      if (next === "reset") {
        setPassword("");
      }
      go(next);
    };

  const steps: Record<
    Mode,
    [
      () => Promise<Outcome>,
      (result: { email: string; value: unknown }) => void,
    ]
  > = {
    confirm: [() => confirmSignUp(supabase, sentTo, code), signedIn(true)],
    forgot: [
      async () => sendPasswordReset(supabase, email, await captcha()),
      codeSent("reset"),
    ],
    reset: [
      () => resetPassword(supabase, sentTo, code, password),
      signedIn(false),
    ],
    signIn: [
      async () =>
        signInWithPassword(supabase, email, password, await captcha()),
      signedIn(false),
    ],
    signUp: [
      async () =>
        signUpWithPassword(supabase, email, password, {
          captchaToken: await captcha(),
          fullName: name,
          locale,
        }),
      codeSent("confirm"),
    ],
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "signUp" && !name.trim()) {
      setError("name_required");
      return;
    }
    const [action, onDone] = steps[mode];
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);
    if (result.ok) {
      onDone(result);
    } else {
      setError(result.code);
    }
  };

  return (
    <form className="grid gap-4" noValidate onSubmit={submit}>
      <ModeFields
        messages={messages}
        mode={mode}
        set={{
          code: setCode,
          email: setEmail,
          name: setName,
          password: setPassword,
        }}
        state={state}
      />
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {messages.errors[error]}
        </p>
      ) : null}
      <Button disabled={!canSubmit(mode, state)} type="submit">
        {pending ? messages.working : (messages[SUBMIT_LABELS[mode]] as string)}
      </Button>
      <ModeLinks
        go={go}
        messages={messages}
        mode={mode}
        onUseCode={onUseCode}
      />
    </form>
  );
};
