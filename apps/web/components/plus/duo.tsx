"use client";

import { planName } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { type Locale, localePath } from "@repo/internationalization";
import { formatDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { CheckIcon, CopyIcon, Share2Icon, UsersIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import {
  type DuoSwapOrder,
  duoErrorKey,
  duoInvitePath,
  type MyDuo,
  useDuoActions,
  useDuoApprovals,
  useDuoInvite,
  useMyDuo,
} from "@/lib/duo";
import { usePlans } from "@/lib/queries";
import { SignedInSection } from "../signed-in-section";
import { SectionSpinner } from "../states";

const SWAP_ORDERS = ["alternate", "holder", "partner"] as const;

const DuoError = ({ error }: { readonly error: Error | null }) => {
  const t = useTranslations("app.plus.duo.errors");
  return error ? (
    <p className="text-destructive text-sm" role="alert">
      {t(duoErrorKey(error))}
    </p>
  ) : null;
};

/** The invite link, to copy or share. */
const InviteLink = ({
  duo,
  token,
}: {
  readonly duo: MyDuo;
  readonly token: string;
}) => {
  const t = useTranslations("app.plus.duo");
  const locale = useLocale() as Locale;
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}${localePath(locale, duoInvitePath(token))}`;
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const share = async () => {
    try {
      await navigator.share({ text: t("shareText"), url: link });
    } catch {
      // Closed without sharing.
    }
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <code
          className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 text-sm"
          dir="ltr"
        >
          {link}
        </code>
        <Button onClick={copy} size="sm" type="button" variant="outline">
          {copied ? (
            <CheckIcon aria-hidden="true" />
          ) : (
            <CopyIcon aria-hidden="true" />
          )}
          {copied ? t("copied") : t("copy")}
        </Button>
        {canShare ? (
          <Button onClick={share} size="sm" type="button" variant="outline">
            <Share2Icon aria-hidden="true" />
            {t("share")}
          </Button>
        ) : null}
      </div>
      {duo.inviteExpiresAt ? (
        <p className="text-muted-foreground text-xs">
          {t("inviteExpires", {
            date: formatDate(duo.inviteExpiresAt, locale),
          })}
        </p>
      ) : null}
    </div>
  );
};

/** The holder's side: invite, the second person, the swap order. */
const HolderDuo = ({ duo }: { readonly duo: MyDuo }) => {
  const t = useTranslations("app.plus.duo");
  const locale = useLocale();
  const id = useId();
  const actions = useDuoActions();
  const name = duo.partnerName ?? t("secondPerson");
  const status = duo.partnerStatus;

  if (status === null || status === "expired") {
    return (
      <div className="grid gap-3">
        <p className="text-sm">
          {status === "expired" ? t("expired") : t("inviteDescription")}
        </p>
        <Button
          className="justify-self-start"
          disabled={actions.invite.isPending}
          onClick={() => actions.invite.mutate()}
          type="button"
        >
          {actions.invite.isPending ? t("inviting") : t("invite")}
        </Button>
        <DuoError error={actions.invite.error} />
      </div>
    );
  }

  if (status === "invited" || status === "guardian") {
    return (
      <div className="grid gap-3">
        <p className="text-sm">
          {status === "guardian"
            ? t("waitingGuardian", { name })
            : t("invited")}
        </p>
        {status === "invited" && duo.inviteToken ? (
          <InviteLink duo={duo} token={duo.inviteToken} />
        ) : null}
        <Button
          className="justify-self-start"
          disabled={actions.remove.isPending}
          onClick={() => actions.remove.mutate(false)}
          size="sm"
          type="button"
          variant="ghost"
        >
          {t("cancelInvite")}
        </Button>
        <DuoError error={actions.remove.error} />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm">
        {status === "ending" && duo.endsAt
          ? t("ending", { date: formatDate(duo.endsAt, locale), name })
          : t("sharing", { name })}
      </p>
      <div className="grid gap-2">
        <Label htmlFor={id}>{t("swapOrder")}</Label>
        <Select
          disabled={actions.setSwapOrder.isPending}
          onValueChange={(value) =>
            actions.setSwapOrder.mutate(value as DuoSwapOrder)
          }
          value={duo.swapOrder}
        >
          <SelectTrigger className="w-full sm:w-72" id={id}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SWAP_ORDERS.map((order) => (
              <SelectItem key={order} value={order}>
                {t(`swapOrders.${order}`, { name })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {status === "ending" ? (
        <Button
          className="justify-self-start"
          disabled={actions.remove.isPending}
          onClick={() => actions.remove.mutate(true)}
          size="sm"
          type="button"
          variant="outline"
        >
          {t("keep", { name })}
        </Button>
      ) : (
        <Button
          className="justify-self-start"
          disabled={actions.remove.isPending}
          onClick={() => actions.remove.mutate(false)}
          size="sm"
          type="button"
          variant="ghost"
        >
          {t("remove", { name })}
        </Button>
      )}
      <DuoError error={actions.remove.error ?? actions.setSwapOrder.error} />
    </div>
  );
};

/** The partner's side: whose Plus it is, and leaving. */
const PartnerDuo = ({ duo }: { readonly duo: MyDuo }) => {
  const t = useTranslations("app.plus.duo");
  const locale = useLocale();
  const actions = useDuoActions();
  const [confirming, setConfirming] = useState(false);
  const holder = duo.holderName ?? t("holder");

  return (
    <div className="grid gap-3">
      <p className="text-sm">
        {duo.partnerStatus === "guardian"
          ? t("partnerGuardian")
          : t("partnerOf", { name: holder })}
      </p>
      {duo.partnerStatus === "ending" && duo.endsAt ? (
        <p className="text-muted-foreground text-sm">
          {t("partnerEnding", { date: formatDate(duo.endsAt, locale) })}
        </p>
      ) : null}
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm">{t("leaveConfirm", { name: holder })}</p>
          <Button
            disabled={actions.leave.isPending}
            onClick={() => actions.leave.mutate()}
            size="sm"
            type="button"
            variant="destructive"
          >
            {t("leave")}
          </Button>
          <Button
            onClick={() => setConfirming(false)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t("stay")}
          </Button>
        </div>
      ) : (
        <Button
          className="justify-self-start"
          onClick={() => setConfirming(true)}
          size="sm"
          type="button"
          variant="ghost"
        >
          {t("leave")}
        </Button>
      )}
      <DuoError error={actions.leave.error} />
    </div>
  );
};

/** Your Plus → Duo: for the holder of a Duo plan or its second person. */
export const DuoPanel = () => {
  const t = useTranslations("app.plus.duo");
  const duo = useMyDuo().data;
  if (!duo) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersIcon aria-hidden="true" className="size-5 text-pink-text" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {duo.role === "holder" ? (
          <HolderDuo duo={duo} />
        ) : (
          <PartnerDuo duo={duo} />
        )}
      </CardContent>
    </Card>
  );
};

const AcceptInvite = ({ token }: { readonly token: string }) => {
  const t = useTranslations("app.plus.duo");
  const locale = useLocale();
  const invite = useDuoInvite(token);
  const plans = usePlans("plus");
  const actions = useDuoActions();

  // Once accepted, the code no longer opens the invite: keep who sent it.
  const holder = useRef<string | null>(null);
  if (invite.data?.holder_name) {
    holder.current = invite.data.holder_name;
  }

  if (actions.accept.isSuccess) {
    return (
      <div className="grid gap-3">
        <p>
          {actions.accept.data?.guardian_status === "pending"
            ? t("joinedGuardian")
            : t("joined", { name: holder.current ?? t("holder") })}
        </p>
        <Button asChild className="justify-self-start">
          <Link href="/plus#yours">{t("toPlus")}</Link>
        </Button>
      </div>
    );
  }
  if (invite.isPending) {
    return <SectionSpinner />;
  }
  const found = invite.data;
  if (!found?.open) {
    return <p className="text-muted-foreground">{t("errors.expired")}</p>;
  }
  const plan = plans.data?.find((item) => item.id === found.plan_id);
  const name = plan
    ? planName(plan, locale)
    : ((locale === "ar" ? found.plan_name_ar : found.plan_name) ?? "");

  return (
    <div className="grid gap-4">
      <p>
        {t("invitedBy", {
          name: found.holder_name ?? t("holder"),
          plan: name,
        })}
      </p>
      <p className="text-muted-foreground text-sm">{t("whatYouGet")}</p>
      <Button
        className="justify-self-start"
        disabled={actions.accept.isPending}
        onClick={() => actions.accept.mutate(token)}
        type="button"
      >
        {actions.accept.isPending ? t("joining") : t("join")}
      </Button>
      <DuoError error={actions.accept.error} />
    </div>
  );
};

/** /plus/duo/<code>: an invite to share someone's Plus. */
export const DuoInvite = ({ token }: { readonly token: string }) => {
  const t = useTranslations("app.plus.duo");
  return (
    <SignedInSection
      id="duo"
      returnTo={duoInvitePath(token)}
      signedOut={t("signedOut")}
      signIn={t("signIn")}
      title={t("inviteTitle")}
    >
      <AcceptInvite token={token} />
    </SignedInSection>
  );
};

/** Pass → Settings → Guardian: a teen's Duo places to approve. */
export const DuoApprovals = () => {
  const t = useTranslations("app.plus.duo");
  const approvals = useDuoApprovals().data ?? [];
  const actions = useDuoActions();

  if (approvals.length === 0) {
    return null;
  }
  return (
    <section className="grid gap-3">
      <h3 className="font-medium">{t("approvalsTitle")}</h3>
      {approvals.map((approval) => (
        <div
          className="flex flex-wrap items-center gap-3 rounded-md border p-3"
          key={approval.place}
        >
          <p className="flex-1">
            {t("approval", {
              holder: approval.holder_name ?? t("holder"),
              name: approval.teen_name ?? "",
            })}
          </p>
          <Button
            disabled={actions.decide.isPending}
            onClick={() =>
              actions.decide.mutate({ approve: true, place: approval.place })
            }
            size="sm"
            type="button"
          >
            {t("approve")}
          </Button>
          <Button
            disabled={actions.decide.isPending}
            onClick={() =>
              actions.decide.mutate({ approve: false, place: approval.place })
            }
            size="sm"
            type="button"
            variant="ghost"
          >
            {t("decline")}
          </Button>
        </div>
      ))}
      <DuoError error={actions.decide.error} />
    </section>
  );
};
