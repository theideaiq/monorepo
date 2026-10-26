"use client";

import { formatPhone } from "@repo/auth/phone";
import type { StaffRole } from "@repo/database";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ActionButton } from "@/components/admin/action-button";
import {
  ActionForm,
  SubmitButton,
  useFormContext,
} from "@/components/admin/action-form";
import { SelectField, TextField } from "@/components/admin/fields";
import { staffRoles } from "@/lib/admin/roles";
import {
  type FoundUser,
  lookupUser,
  revokeStaff,
  setStaffRole,
} from "./actions";

/** Role and title of a staff member (or of an account being granted). */
export const RoleForm = ({
  role,
  submitLabel,
  title,
  userId,
}: {
  readonly role: StaffRole | null;
  readonly submitLabel?: string;
  readonly title: string | null;
  readonly userId: string;
}) => {
  const t = useTranslations("admin.staff");
  const tRoles = useTranslations("admin.roles");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm
      action={setStaffRole}
      className="flex flex-wrap items-end gap-2"
    >
      <input name="userId" type="hidden" value={userId} />
      <SelectField
        defaultValue={role ?? "support"}
        label={t("role")}
        name="role"
        options={staffRoles.map((value) => ({ label: tRoles(value), value }))}
        wrapperClassName="w-40"
      />
      <TextField
        defaultValue={title ?? ""}
        label={t("jobTitle")}
        maxLength={120}
        name="title"
        wrapperClassName="min-w-40 flex-1"
      />
      <SubmitButton variant={role ? "secondary" : "default"}>
        {submitLabel ?? tCommon("save")}
      </SubmitButton>
    </ActionForm>
  );
};

export const RevokeButton = ({
  name,
  userId,
}: {
  readonly name: string;
  readonly userId: string;
}) => {
  const t = useTranslations("admin.staff");

  return (
    <ActionButton
      action={revokeStaff}
      confirm={{
        description: t("revokeDescription"),
        title: t("revokeConfirm", { name }),
      }}
      fields={{ userId }}
      variant="ghost"
    >
      {t("revoke")}
    </ActionButton>
  );
};

/** Finds an account by phone number or email, then offers to grant a role. */
export const StaffLookup = () => {
  const t = useTranslations("admin.staff");
  const tRoles = useTranslations("admin.roles");
  const [user, setUser] = useState<FoundUser | null>(null);

  return (
    <div className="grid gap-4">
      <ActionForm
        action={lookupUser}
        className="flex flex-wrap items-end gap-2"
        onSuccess={(state) => setUser(state.data?.user as FoundUser)}
        silent
      >
        <TextField
          dir="ltr"
          hint={t("lookupHint")}
          label={t("lookup")}
          maxLength={320}
          name="query"
          wrapperClassName="min-w-64 flex-1"
        />
        <SubmitButton variant="secondary">{t("find")}</SubmitButton>
        <LookupError />
      </ActionForm>
      {user ? (
        <div className="grid gap-3 rounded-md border p-4">
          <div className="grid gap-0.5">
            <span className="font-medium">{user.fullName ?? t("unnamed")}</span>
            <span className="text-muted-foreground text-sm" dir="ltr">
              {[user.phone ? formatPhone(user.phone) : null, user.email]
                .filter(Boolean)
                .join(" · ")}
            </span>
            {user.staffRole ? (
              <span className="text-sm">
                {t("currentRole", { role: tRoles(user.staffRole) })}
              </span>
            ) : null}
          </div>
          <RoleForm
            key={user.id}
            role={user.staffRole}
            submitLabel={user.staffRole ? undefined : t("grant")}
            title={user.staffTitle}
            userId={user.id}
          />
        </div>
      ) : null}
    </div>
  );
};

const LookupError = () => {
  const t = useTranslations("admin.staff");
  const tErrors = useTranslations("admin.errors");
  const { state } = useFormContext();
  if (state.status !== "error") {
    return null;
  }
  return (
    <p className="w-full text-destructive text-sm" role="alert">
      {state.error === "notFound" ? t("notFound") : tErrors(state.error)}
    </p>
  );
};
