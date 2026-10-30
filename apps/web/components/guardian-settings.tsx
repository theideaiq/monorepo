"use client";

import { formatPrice } from "@repo/commerce";
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
import { Switch } from "@repo/design-system/components/ui/switch";
import { formatNumber } from "@repo/internationalization/format";
import { ShieldCheckIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import {
  guardianInviteUrl,
  type PendingOrder,
  useGuardianActions,
  useGuardianInvite,
  useMyGuardian,
  useMyTeens,
} from "@/lib/guardian";
import { DuoApprovals } from "./plus/duo";
import { TeenApplications } from "./teen-applications";

const errorKey = (error: Error | null) => {
  const message = error?.message ?? "";
  if (message.includes("18 or over")) {
    return "tooYoung";
  }
  if (message.includes("expired")) {
    return "expired";
  }
  return "failed";
};

/** A 13–17-year-old's side: invite a guardian, see who it is. */
const TeenGuardian = () => {
  const t = useTranslations("app.settings.guardian");
  const guardian = useMyGuardian().data;
  const actions = useGuardianActions();
  const [copied, setCopied] = useState(false);

  if (guardian?.status === "active") {
    return (
      <div className="grid gap-2 text-sm">
        <p className="font-medium">
          {t("linked", { name: guardian.guardian_name ?? "" })}
        </p>
        <p className="text-muted-foreground">
          {guardian.allows_plus ? t("plusAllowed") : t("plusNotAllowed")}
        </p>
      </div>
    );
  }

  const code = guardian?.status === "invited" ? guardian.code : null;
  const link = code ? guardianInviteUrl(window.location.origin, code) : null;
  return (
    <div className="grid gap-3 text-sm">
      {link && code ? (
        <>
          <p>{t("inviteHelp")}</p>
          <p className="font-mono" dir="ltr">
            {t("code", { code })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              }}
              type="button"
              variant="outline"
            >
              {copied ? t("copied") : t("copy")}
            </Button>
            <Button
              disabled={actions.invite.isPending}
              onClick={() => actions.invite.mutate()}
              type="button"
              variant="ghost"
            >
              {t("newCode")}
            </Button>
          </div>
          <p className="text-muted-foreground">{t("waiting")}</p>
        </>
      ) : (
        <Button
          className="justify-self-start"
          disabled={actions.invite.isPending}
          onClick={() => actions.invite.mutate()}
          type="button"
        >
          {t("invite")}
        </Button>
      )}
      {actions.invite.isError ? (
        <p className="text-destructive" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};

/** One order waiting for the guardian. */
const PendingOrderRow = ({ order }: { readonly order: PendingOrder }) => {
  const t = useTranslations("app.settings.guardian");
  const locale = useLocale();
  const { decide } = useGuardianActions();
  return (
    <li className="flex flex-wrap items-center gap-2">
      <span className="flex-1">
        {t("order", {
          items: t("items", {
            count: order.items,
            n: formatNumber(order.items, locale),
          }),
          number: String(order.number),
          total: formatPrice(order.total, locale),
        })}
      </span>
      <Button
        disabled={decide.isPending}
        onClick={() => decide.mutate({ approve: true, order: order.id })}
        size="sm"
        type="button"
      >
        {t("approve")}
      </Button>
      <Button
        disabled={decide.isPending}
        onClick={() => decide.mutate({ approve: false, order: order.id })}
        size="sm"
        type="button"
        variant="outline"
      >
        {t("decline")}
      </Button>
    </li>
  );
};

/** An adult's side: accept an invite, look after teens. */
const AdultGuardian = () => {
  const t = useTranslations("app.settings.guardian");
  const id = useId();
  const [code, setCode] = useState(useSearchParams().get("guardian") ?? "");
  const [checking, setChecking] = useState<string | null>(code || null);
  const invite = useGuardianInvite(checking);
  const teens = useMyTeens().data ?? [];
  const actions = useGuardianActions();

  const check = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChecking(code.trim() || null);
  };

  return (
    <div className="grid gap-5 text-sm">
      <TeenApplications />
      <DuoApprovals />
      {teens.length > 0 ? (
        <section className="grid gap-3">
          <h3 className="font-medium">{t("teens")}</h3>
          {teens.map((teen) => (
            <div
              className="grid gap-2 rounded-md border p-3"
              key={teen.link_id}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex-1 font-medium">{teen.teen_name}</span>
                <Label className="flex items-center gap-2">
                  <Switch
                    checked={teen.allows_plus}
                    onCheckedChange={(allow) =>
                      actions.allowPlus.mutate({ allow, link: teen.link_id })
                    }
                  />
                  {t("allowPlus")}
                </Label>
                <Button
                  onClick={() => actions.revoke.mutate(teen.link_id)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {t("remove")}
                </Button>
              </div>
              {teen.pending_orders.length > 0 ? (
                <ul className="grid gap-2">
                  {teen.pending_orders.map((order) => (
                    <PendingOrderRow key={order.id} order={order} />
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">{t("noPending")}</p>
              )}
            </div>
          ))}
        </section>
      ) : null}

      <section className="grid gap-3">
        <h3 className="font-medium">{t("acceptTitle")}</h3>
        <form className="flex flex-wrap items-end gap-3" onSubmit={check}>
          <div className="grid gap-2">
            <Label htmlFor={id}>{t("codeLabel")}</Label>
            <Input
              className="w-48 font-mono"
              dir="ltr"
              id={id}
              onChange={(event) => setCode(event.target.value)}
              value={code}
            />
          </div>
          <Button disabled={!code.trim()} type="submit" variant="outline">
            {t("check")}
          </Button>
        </form>
        {invite.data?.status === "invited" && checking ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1">
              {t("inviteFrom", { name: invite.data.teen_name ?? "" })}
            </p>
            <Button
              disabled={actions.accept.isPending}
              onClick={() =>
                actions.accept.mutate(checking, {
                  onSuccess: () => {
                    setChecking(null);
                    setCode("");
                  },
                })
              }
              type="button"
            >
              {t("accept")}
            </Button>
          </div>
        ) : null}
        {invite.data && invite.data.status !== "invited" ? (
          <p className="text-muted-foreground">{t("inviteUsed")}</p>
        ) : null}
        {actions.accept.isError ? (
          <p className="text-destructive" role="alert">
            {t(errorKey(actions.accept.error))}
          </p>
        ) : null}
      </section>
    </div>
  );
};

/**
 * Your Pass → Settings: guardians. Teens (13–17) invite one; adults accept
 * an invite and approve their teens' orders and The IDEA Plus.
 */
export const GuardianCard = () => {
  const t = useTranslations("app.settings.guardian");
  const guardian = useMyGuardian();

  if (guardian.isPending || guardian.isError || !guardian.data) {
    return null;
  }
  const { has_birthday: hasBirthday, minor } = guardian.data;

  return (
    <Card id="guardian">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheckIcon
            aria-hidden="true"
            className="size-5 text-pink-text"
          />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {minor ? t("teenDescription") : t("adultDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasBirthday ? null : (
          <p className="text-muted-foreground text-sm">{t("needsBirthday")}</p>
        )}
        {hasBirthday && minor ? <TeenGuardian /> : null}
        {hasBirthday && !minor ? <AdultGuardian /> : null}
      </CardContent>
    </Card>
  );
};
