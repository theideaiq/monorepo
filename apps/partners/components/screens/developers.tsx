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
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  formatDateTime,
  formatNumber,
} from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  APP_ANSWERS,
  type AppAnswer,
  type AppInput,
  type Credentials,
  developerError,
  lines,
  type PassApp,
  SENSITIVE_ANSWERS,
  useAddDomain,
  useCreateApp,
  useEndPreviousSecret,
  usePassApps,
  usePassDomains,
  useRemoveDomain,
  useRotateSecret,
  useSetAppKeys,
  useSetAppState,
  useUpdateApp,
  useVerifyDomain,
} from "@/lib/developer-queries";

const NS = "app.company.developers";

interface Urls {
  apiUrl: string;
}

/** An error from a mutation, in the reader's language. */
const Failure = ({ error }: { readonly error: unknown }) => {
  const t = useTranslations(`${NS}.errors`);
  if (!error) {
    return null;
  }
  return (
    <p className="text-destructive text-sm" role="alert">
      {t(developerError(error))}
    </p>
  );
};

/** A value to copy, left to right whatever the language. */
const Code = ({ children }: { readonly children: ReactNode }) => (
  <code
    className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
    dir="ltr"
  >
    {children}
  </code>
);

/** The client id and secret, shown once. */
const ShowOnce = ({
  apiUrl,
  credentials,
}: Urls & { readonly credentials: Credentials }) => {
  const t = useTranslations(NS);
  return (
    <div
      className="grid gap-2 rounded-md border border-pink-text/40 bg-muted p-3 text-sm"
      role="status"
    >
      <p className="font-medium">{t("once")}</p>
      <p>
        {t("clientId")}: <Code>{credentials.clientId}</Code>
      </p>
      <p>
        {t("secret")}: <Code>{credentials.secret}</Code>
      </p>
      <p>
        {t("discovery")}:{" "}
        <Code>{`${apiUrl}/oidc/.well-known/openid-configuration`}</Code>
      </p>
    </div>
  );
};

// ── The guide ────────────────────────────────────────────────────────────

const Guide = ({ apiUrl }: Urls) => {
  const t = useTranslations(NS);
  const steps = ["domain", "app", "test", "live"] as const;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <ol className="grid list-decimal gap-1 ps-5">
          {steps.map((step) => (
            <li key={step}>{t(`steps.${step}`)}</li>
          ))}
        </ol>
        <details className="rounded-md border p-3">
          <summary className="cursor-pointer font-medium">
            {t("guide.title")}
          </summary>
          <div className="grid gap-2 pt-3">
            <p>
              {t("discovery")}:{" "}
              <Code>{`${apiUrl}/oidc/.well-known/openid-configuration`}</Code>
            </p>
            <p>{t("guide.flow")}</p>
            <p>{t("guide.auth")}</p>
            <p>{t("guide.scopes")}</p>
            <p>{t("guide.card")}</p>
            <p>{t("guide.keys")}</p>
          </div>
        </details>
      </CardContent>
    </Card>
  );
};

// ── Domains ──────────────────────────────────────────────────────────────

type Domain = NonNullable<ReturnType<typeof usePassDomains>["data"]>[number];

const DomainRow = ({
  domain,
  org,
}: {
  readonly domain: Domain;
  readonly org: string;
}) => {
  const t = useTranslations(NS);
  const verify = useVerifyDomain(org);
  const remove = useRemoveDomain(org);
  const tried = verify.isSuccess && !verify.data.verified;
  return (
    <li className="grid gap-2 rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-medium" dir="ltr">
          {domain.domain}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {domain.verified_at ? (
            <Badge>{t("domains.verified")}</Badge>
          ) : (
            <Badge variant="outline">{t("domains.notVerified")}</Badge>
          )}
          <Button
            disabled={remove.isPending}
            onClick={() => remove.mutate(domain.id)}
            size="sm"
            variant="ghost"
          >
            {t("domains.remove")}
          </Button>
        </span>
      </div>
      {domain.verified_at ? null : (
        <div className="grid gap-2 text-muted-foreground">
          <p>{t("domains.how")}</p>
          <p>
            {t("domains.txt")} <Code>{`_theidea-pass.${domain.domain}`}</Code>{" "}
            <Code>{`theidea-pass-verification=${domain.token}`}</Code>
          </p>
          <p>
            {t("domains.file")}{" "}
            <Code>{`https://${domain.domain}/.well-known/theidea-pass-verification.txt`}</Code>{" "}
            <Code>{domain.token}</Code>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={verify.isPending}
              onClick={() => verify.mutate(domain.id)}
              size="sm"
            >
              {verify.isPending ? t("domains.checking") : t("domains.check")}
            </Button>
            {tried ? (
              <span className="text-sm" role="status">
                {t("domains.notFound")}
              </span>
            ) : null}
          </div>
        </div>
      )}
      <Failure error={verify.error ?? remove.error} />
    </li>
  );
};

const Domains = ({ org }: { readonly org: string }) => {
  const t = useTranslations(NS);
  const id = useId();
  const domains = usePassDomains(org);
  const add = useAddDomain(org);
  const [name, setName] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    add.mutate(name, { onSuccess: () => setName("") });
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("domains.title")}</CardTitle>
        <CardDescription>{t("domains.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {domains.isPending ? <SectionSpinner /> : null}
        {domains.isError ? (
          <ErrorState onRetry={() => domains.refetch()} />
        ) : null}
        {(domains.data ?? []).length > 0 ? (
          <ul className="grid gap-2">
            {(domains.data ?? []).map((domain) => (
              <DomainRow domain={domain} key={domain.id} org={org} />
            ))}
          </ul>
        ) : null}
        <form className="flex flex-wrap items-end gap-2" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-domain`}>{t("domains.add")}</Label>
            <Input
              autoCapitalize="none"
              className="w-64 text-start"
              dir="ltr"
              id={`${id}-domain`}
              maxLength={253}
              onChange={(event) => setName(event.target.value)}
              spellCheck={false}
              value={name}
            />
          </div>
          <Button disabled={add.isPending || !name.trim()} type="submit">
            {t("domains.addButton")}
          </Button>
        </form>
        <Failure error={add.error} />
      </CardContent>
    </Card>
  );
};

// ── Apps ─────────────────────────────────────────────────────────────────

/** The app's name, addresses and answers (new or existing). */
const AppForm = ({
  error,
  initial,
  onSubmit,
  pending,
  submitLabel,
}: {
  readonly error: unknown;
  readonly initial?: AppInput;
  readonly onSubmit: (input: AppInput) => void;
  readonly pending: boolean;
  readonly submitLabel: string;
}) => {
  const t = useTranslations(NS);
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "https://");
  const [uris, setUris] = useState((initial?.redirectUris ?? []).join("\n"));
  const [answers, setAnswers] = useState<AppAnswer[]>(
    initial?.answers ?? ["profile", "email"]
  );
  const toggle = (answer: AppAnswer, on: boolean) =>
    setAnswers((current) =>
      on ? [...current, answer] : current.filter((item) => item !== answer)
    );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      answers,
      name: name.trim(),
      redirectUris: lines(uris),
      website: website.trim(),
    });
  };
  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-name`}>{t("apps.name")}</Label>
          <Input
            id={`${id}-name`}
            maxLength={80}
            minLength={2}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-website`}>{t("apps.website")}</Label>
          <Input
            className="text-start"
            dir="ltr"
            id={`${id}-website`}
            maxLength={200}
            onChange={(event) => setWebsite(event.target.value)}
            required
            type="url"
            value={website}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-uris`}>{t("apps.redirectUris")}</Label>
        <Textarea
          className="text-start font-mono text-xs"
          dir="ltr"
          id={`${id}-uris`}
          onChange={(event) => setUris(event.target.value)}
          required
          rows={3}
          value={uris}
        />
        <p className="text-muted-foreground text-xs">
          {t("apps.redirectUrisHint")}
        </p>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 font-medium text-sm">
          {t("apps.answers")}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {APP_ANSWERS.map((answer) => (
            <label
              className="flex items-center gap-2 text-sm"
              htmlFor={`${id}-${answer}`}
              key={answer}
            >
              <Checkbox
                checked={answers.includes(answer)}
                id={`${id}-${answer}`}
                onCheckedChange={(on) => toggle(answer, on === true)}
              />
              {t(`answers.${answer}`)}
              {SENSITIVE_ANSWERS.includes(answer) ? (
                <Badge variant="outline">{t("apps.reviewed")}</Badge>
              ) : null}
            </label>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">{t("apps.answersHint")}</p>
      </fieldset>
      <Failure error={error} />
      <Button
        className="justify-self-start"
        disabled={pending || name.trim().length < 2 || lines(uris).length === 0}
        type="submit"
      >
        {submitLabel}
      </Button>
    </form>
  );
};

const NewApp = ({ apiUrl, org }: Urls & { readonly org: string }) => {
  const t = useTranslations(NS);
  const create = useCreateApp(org);
  const [made, setMade] = useState<Credentials | null>(null);
  const [formKey, setFormKey] = useState(0);
  return (
    <details className="rounded-md border p-3">
      <summary className="cursor-pointer font-medium text-sm">
        {t("apps.new")}
      </summary>
      <div className="grid gap-4 pt-3">
        <AppForm
          error={create.error}
          key={formKey}
          onSubmit={(input) =>
            create.mutate(input, {
              onSuccess: (credentials) => {
                setMade(credentials);
                setFormKey((value) => value + 1);
              },
            })
          }
          pending={create.isPending}
          submitLabel={t("apps.create")}
        />
        {made ? <ShowOnce apiUrl={apiUrl} credentials={made} /> : null}
      </div>
    </details>
  );
};

/** Testing or live, on or off. */
const AppState = ({
  app,
  org,
}: {
  readonly app: PassApp;
  readonly org: string;
}) => {
  const t = useTranslations(NS);
  const state = useSetAppState(org);
  const live = app.mode === "live";
  return (
    <>
      <Button
        disabled={state.isPending}
        onClick={() =>
          state.mutate({
            client: app.client_id,
            enabled: app.enabled,
            live: !live,
          })
        }
        size="sm"
        variant={live ? "outline" : "default"}
      >
        {live ? t("apps.backToTesting") : t("apps.goLive")}
      </Button>
      <Button
        disabled={state.isPending}
        onClick={() =>
          state.mutate({
            client: app.client_id,
            enabled: !app.enabled,
            live,
          })
        }
        size="sm"
        variant="outline"
      >
        {app.enabled ? t("apps.turnOff") : t("apps.turnOn")}
      </Button>
      <Failure error={state.error} />
    </>
  );
};

/** A new secret (shown once); the previous one can keep working a day. */
const Secrets = ({
  apiUrl,
  app,
  org,
}: Urls & { readonly app: PassApp; readonly org: string }) => {
  const t = useTranslations(NS);
  const locale = useLocale();
  const id = useId();
  const rotate = useRotateSecret(org);
  const end = useEndPreviousSecret(org);
  const [keepPrevious, setKeepPrevious] = useState(true);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={rotate.isPending}
          onClick={() => rotate.mutate({ client: app.client_id, keepPrevious })}
          size="sm"
          variant="outline"
        >
          {t("secrets.rotate")}
        </Button>
        <label className="flex items-center gap-2 text-sm" htmlFor={id}>
          <Checkbox
            checked={keepPrevious}
            id={id}
            onCheckedChange={(on) => setKeepPrevious(on === true)}
          />
          {t("secrets.keepPrevious")}
        </label>
      </div>
      {app.previous_secret_until ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>
            {t("secrets.previousUntil", {
              date: formatDateTime(app.previous_secret_until, locale),
            })}
          </span>
          <Button
            disabled={end.isPending}
            onClick={() => end.mutate(app.client_id)}
            size="sm"
            variant="ghost"
          >
            {t("secrets.endPrevious")}
          </Button>
        </div>
      ) : null}
      {rotate.data ? (
        <ShowOnce apiUrl={apiUrl} credentials={rotate.data} />
      ) : null}
      <Failure error={rotate.error ?? end.error} />
    </div>
  );
};

/** Public keys for private_key_jwt, instead of the secret. */
const Keys = ({
  app,
  org,
}: {
  readonly app: PassApp;
  readonly org: string;
}) => {
  const t = useTranslations(NS);
  const id = useId();
  const save = useSetAppKeys(org);
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const parsed = JSON.parse(text) as object;
      setInvalid(false);
      save.mutate(
        { client: app.client_id, jwks: parsed },
        { onSuccess: () => setText("") }
      );
    } catch {
      setInvalid(true);
    }
  };
  return (
    <form className="grid gap-2" onSubmit={submit}>
      <Label htmlFor={id}>{t("keys.label")}</Label>
      <p className="text-muted-foreground text-xs">{t("keys.hint")}</p>
      <Textarea
        className="text-start font-mono text-xs"
        dir="ltr"
        id={id}
        onChange={(event) => setText(event.target.value)}
        rows={4}
        value={text}
      />
      {invalid ? (
        <p className="text-destructive text-sm" role="alert">
          {t("errors.invalidKeys")}
        </p>
      ) : null}
      <Failure error={save.error} />
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={save.isPending || !text.trim()}
          size="sm"
          type="submit"
        >
          {t("keys.save")}
        </Button>
        {app.has_keys ? (
          <Button
            disabled={save.isPending}
            onClick={() => save.mutate({ client: app.client_id, jwks: null })}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t("keys.remove")}
          </Button>
        ) : null}
      </div>
      {app.has_keys ? (
        <p className="text-muted-foreground text-xs">{t("keys.saved")}</p>
      ) : null}
    </form>
  );
};

/** The app's badges: testing or live, off, suspended, review. */
const AppBadges = ({ app }: { readonly app: PassApp }) => {
  const t = useTranslations(NS);
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Badge variant={app.mode === "live" ? "default" : "outline"}>
        {app.mode === "live" ? t("apps.live") : t("apps.testing")}
      </Badge>
      {app.enabled ? null : <Badge variant="secondary">{t("apps.off")}</Badge>}
      {app.suspended ? (
        <Badge variant="destructive">{t("apps.suspended")}</Badge>
      ) : null}
      {app.review_status === "pending" ? (
        <Badge variant="outline">{t("apps.pending")}</Badge>
      ) : null}
      {app.review_status === "declined" ? (
        <Badge variant="destructive">{t("apps.declined")}</Badge>
      ) : null}
    </span>
  );
};

const AppCard = ({
  apiUrl,
  app,
  org,
}: Urls & { readonly app: PassApp; readonly org: string }) => {
  const t = useTranslations(NS);
  const locale = useLocale();
  const update = useUpdateApp(org);
  const waiting = app.requested_answers.filter(
    (answer) => !app.answers.includes(answer)
  );
  const names = (answers: string[]) =>
    answers.map((answer) => t(`answers.${answer as AppAnswer}`)).join(" · ");
  return (
    <li className="grid gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-1">
          <p className="font-medium">{app.name}</p>
          <p className="text-muted-foreground text-xs" dir="ltr">
            {app.client_id} · {app.website}
          </p>
        </div>
        <AppBadges app={app} />
      </div>
      <p className="text-sm">
        {t("apps.asks", { answers: names(app.answers) })}
      </p>
      {waiting.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          {app.mode === "testing"
            ? t("apps.testingAll", { answers: names(waiting) })
            : t("apps.waiting", { answers: names(waiting) })}
        </p>
      ) : null}
      {app.review_note ? (
        <p className="rounded-md bg-muted p-2 text-sm">
          {t("apps.note", { note: app.review_note })}
        </p>
      ) : null}
      <p className="text-muted-foreground text-xs">
        {t("apps.numbers", {
          checks: formatNumber(app.card_checks_30d, locale),
          connected: formatNumber(app.connections, locale),
          signIns: formatNumber(app.sign_ins_30d, locale),
        })}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <AppState app={app} org={org} />
      </div>
      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm">{t("apps.edit")}</summary>
        <div className="pt-3">
          <AppForm
            error={update.error}
            initial={{
              answers: app.requested_answers as AppAnswer[],
              name: app.name,
              redirectUris: app.redirect_uris,
              website: app.website,
            }}
            onSubmit={(input) =>
              update.mutate({ ...input, client: app.client_id })
            }
            pending={update.isPending}
            submitLabel={t("apps.save")}
          />
          {update.isSuccess ? (
            <p className="pt-2 text-muted-foreground text-sm" role="status">
              {t("apps.saved")}
            </p>
          ) : null}
        </div>
      </details>
      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm">
          {t("secrets.title")}
        </summary>
        <div className="grid gap-4 pt-3">
          <Secrets apiUrl={apiUrl} app={app} org={org} />
          <Keys app={app} org={org} />
        </div>
      </details>
    </li>
  );
};

const Apps = ({ apiUrl, org }: Urls & { readonly org: string }) => {
  const t = useTranslations(NS);
  const apps = usePassApps(org);
  const domains = usePassDomains(org);
  const ready = (domains.data ?? []).some((domain) => domain.verified_at);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("apps.title")}</CardTitle>
        <CardDescription>{t("apps.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {apps.isPending ? <SectionSpinner /> : null}
        {apps.isError ? <ErrorState onRetry={() => apps.refetch()} /> : null}
        {(apps.data ?? []).length > 0 ? (
          <ul className="grid gap-3">
            {(apps.data ?? []).map((app) => (
              <AppCard
                apiUrl={apiUrl}
                app={app}
                key={app.client_id}
                org={org}
              />
            ))}
          </ul>
        ) : null}
        {ready ? (
          <NewApp apiUrl={apiUrl} org={org} />
        ) : (
          <p className="text-muted-foreground text-sm">
            {t("apps.verifyFirst")}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const DevelopersBody = ({ apiUrl }: Urls) => {
  const t = useTranslations(NS);
  const { active, canManage } = useActiveOrganization();
  if (!canManage) {
    return <p className="text-muted-foreground">{t("adminsOnly")}</p>;
  }
  return (
    <div className="grid max-w-3xl gap-6">
      <Guide apiUrl={apiUrl} />
      <Domains org={active.id} />
      <Apps apiUrl={apiUrl} org={active.id} />
    </div>
  );
};

const KeyedDevelopers = ({ apiUrl }: Urls) => {
  const { active } = useActiveOrganization();
  return <DevelopersBody apiUrl={apiUrl} key={active.id} />;
};

/**
 * The IDEA Partners → Developers: the company's own Sign in with The IDEA
 * Pass apps (domains, apps, secrets and keys).
 */
export const Developers = ({ apiUrl }: Urls) => (
  <BusinessShell>
    <KeyedDevelopers apiUrl={apiUrl} />
  </BusinessShell>
);
