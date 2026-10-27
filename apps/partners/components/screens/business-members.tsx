"use client";

import { formatPhone } from "@repo/auth/phone";
import { useAuth } from "@repo/auth/provider";
import type { OrgRole } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { localePath } from "@repo/internationalization";
import { formatDate } from "@repo/internationalization/format";
import { useRouter } from "@repo/internationalization/navigation";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import { env } from "@/env";
import {
  parseInvitee,
  useChangeRole,
  useInvite,
  useMembers,
  useOrganizationInvitations,
  useRemoveMember,
  useRevokeInvitation,
} from "@/lib/business-queries";

const inviteLink = (locale: string, token: string) =>
  `${env.NEXT_PUBLIC_APP_URL}${localePath(locale, "/invite")}?token=${token}`;

const CopyButton = ({ text }: { readonly text: string }) => {
  const t = useTranslations("app.business.members.pending");
  const [copied, setCopied] = useState(false);
  return (
    <Button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          // Clipboard blocked; nothing else to do.
        }
      }}
      size="sm"
      variant="outline"
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? t("copied") : t("copy")}
    </Button>
  );
};

const MemberList = () => {
  const t = useTranslations("app");
  const router = useRouter();
  const { user } = useAuth();
  const { active, canManage } = useActiveOrganization();
  const members = useMembers(active.id);
  const changeRole = useChangeRole(active.id);
  const remove = useRemoveMember(active.id);
  const isOwner = active.role === "owner";
  const roles: OrgRole[] = isOwner
    ? ["owner", "admin", "member"]
    : ["admin", "member"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("business.members.title")}</CardTitle>
        <CardDescription>{t("business.members.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {members.isPending ? <SectionSpinner /> : null}
        {members.isError ? (
          <ErrorState onRetry={() => members.refetch()} />
        ) : null}
        <ul className="divide-y">
          {members.data?.map((member) => {
            const self = member.userId === user?.id;
            const editable =
              canManage && !self && (isOwner || member.role !== "owner");
            return (
              <li
                className="flex flex-wrap items-center justify-between gap-3 py-3"
                key={member.userId}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium text-sm">
                    {member.fullName || t("business.members.unnamed")}
                  </span>
                  {self ? (
                    <Badge variant="secondary">
                      {t("business.members.you")}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {editable ? (
                    <Select
                      disabled={changeRole.isPending}
                      onValueChange={(role) =>
                        changeRole.mutate({
                          role: role as OrgRole,
                          userId: member.userId,
                        })
                      }
                      value={member.role}
                    >
                      <SelectTrigger
                        aria-label={t("business.members.role")}
                        className="w-32"
                        size="sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {t(`roles.${role}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      {t(`roles.${member.role}`)}
                    </span>
                  )}
                  {editable || self ? (
                    <Button
                      disabled={remove.isPending}
                      onClick={() =>
                        remove.mutate(member.userId, {
                          onSuccess: () => {
                            if (self) {
                              router.replace("/");
                            }
                          },
                        })
                      }
                      size="sm"
                      variant="ghost"
                    >
                      {self
                        ? t("business.members.leave")
                        : t("business.members.remove")}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        {changeRole.isError || remove.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("business.members.failed")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};

const Invitations = () => {
  const t = useTranslations("app");
  const locale = useLocale();
  const id = useId();
  const { active, canManage } = useActiveOrganization();
  const invitations = useOrganizationInvitations(active.id, canManage);
  const invite = useInvite(active.id);
  const revoke = useRevokeInvitation(active.id);
  const [invitee, setInvitee] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [invalid, setInvalid] = useState(false);
  const [sentToken, setSentToken] = useState<string | null>(null);

  if (!canManage) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("business.members.invite.managersOnly")}
      </p>
    );
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSentToken(null);
    const parsed = parseInvitee(invitee);
    setInvalid(!parsed);
    if (!parsed) {
      return;
    }
    invite.mutate(
      { invitee: parsed, role },
      {
        onSuccess: (created) => {
          setInvitee("");
          setSentToken(created?.token ?? null);
        },
      }
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("business.members.invite.title")}</CardTitle>
          <CardDescription>
            {t("business.members.invite.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={submit}
          >
            <div className="grid flex-1 gap-2">
              <Label htmlFor={`${id}-invitee`}>
                {t("business.members.invite.invitee")}
              </Label>
              <Input
                aria-invalid={invalid}
                autoCapitalize="none"
                className="text-start"
                dir="ltr"
                id={`${id}-invitee`}
                maxLength={254}
                onChange={(event) => setInvitee(event.target.value)}
                value={invitee}
              />
            </div>
            <Select
              onValueChange={(value) =>
                setRole(value === "admin" ? "admin" : "member")
              }
              value={role}
            >
              <SelectTrigger
                aria-label={t("business.members.role")}
                className="sm:w-32"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">{t("roles.member")}</SelectItem>
                <SelectItem value="admin">{t("roles.admin")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              disabled={invite.isPending || !invitee.trim()}
              type="submit"
            >
              {invite.isPending
                ? t("business.members.invite.submitting")
                : t("business.members.invite.submit")}
            </Button>
          </form>
          {invalid ? (
            <p className="text-destructive text-sm" role="alert">
              {t("business.members.invite.invalid")}
            </p>
          ) : null}
          {invite.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {t("business.members.failed")}
            </p>
          ) : null}
          {sentToken ? (
            <div
              className="flex flex-wrap items-center gap-2 rounded-md bg-muted p-3 text-sm"
              role="status"
            >
              <span className="flex-1">
                {t("business.members.invite.sent")}
              </span>
              <CopyButton text={inviteLink(locale, sentToken)} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("business.members.pending.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.isPending ? <SectionSpinner /> : null}
          {invitations.data?.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("business.members.pending.empty")}
            </p>
          ) : null}
          <ul className="divide-y">
            {invitations.data?.map((invitation) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 py-3"
                key={invitation.id}
              >
                <div className="grid min-w-0 gap-0.5">
                  <span className="truncate text-start text-sm" dir="ltr">
                    {invitation.invitee.startsWith("+")
                      ? formatPhone(invitation.invitee)
                      : invitation.invitee}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {t(`roles.${invitation.role}`)} ·{" "}
                    {t("business.members.pending.expires", {
                      date: formatDate(invitation.expires_at, locale),
                    })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <CopyButton text={inviteLink(locale, invitation.token)} />
                  <Button
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(invitation.id)}
                    size="sm"
                    variant="ghost"
                  >
                    {t("business.members.pending.revoke")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
};

export const BusinessMembers = () => (
  <BusinessShell>
    <div className="grid max-w-3xl gap-6">
      <MemberList />
      <Invitations />
    </div>
  </BusinessShell>
);
