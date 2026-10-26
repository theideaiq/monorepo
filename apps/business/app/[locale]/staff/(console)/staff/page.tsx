import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { profileNames } from "@/lib/admin/profiles";
import { staffRoles } from "@/lib/admin/roles";
import { requireSection } from "@/lib/admin/session";
import { RevokeButton, RoleForm, StaffLookup } from "./staff-forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.staff");
  return { title: t("title") };
};

/** Who has which staff role (superadmins only; `set_staff_role`). */
const StaffPage = async () => {
  const { staff: me, supabase } = await requireSection("staff", "write");
  const t = await getTranslations("admin.staff");
  const tRoles = await getTranslations("admin.roles");
  const format = formatters(await getLocale());

  const { data: rows } = await supabase
    .from("staff")
    .select("user_id, role, title, created_at, granted_by");
  const names = await profileNames(supabase, [
    ...(rows ?? []).map((row) => row.user_id),
    ...(rows ?? []).map((row) => row.granted_by),
  ]);
  const members = [...(rows ?? [])].sort(
    (a, b) =>
      staffRoles.indexOf(a.role) - staffRoles.indexOf(b.role) ||
      (names.get(a.user_id) ?? "").localeCompare(names.get(b.user_id) ?? "")
  );

  return (
    <>
      <PageHeader description={t("description")} title={t("title")} />
      <PageBody className="max-w-5xl">
        <Panel description={t("addDescription")} title={t("add")}>
          <StaffLookup />
        </Panel>
        <Panel title={t("members", { count: format.number(members.length) })}>
          {members.map((member) => {
            const name = names.get(member.user_id) ?? t("unnamed");
            return (
              <div
                className="grid gap-3 rounded-md border p-3"
                key={member.user_id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="grid gap-0.5">
                    <span className="flex items-center gap-2 font-medium">
                      {name}
                      <StatusBadge
                        tone={
                          member.role === "superadmin" ? "brand" : "neutral"
                        }
                      >
                        {tRoles(member.role)}
                      </StatusBadge>
                      {member.user_id === me.userId ? (
                        <StatusBadge tone="info">{t("you")}</StatusBadge>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {member.granted_by
                        ? t("grantedBy", {
                            date: format.date(member.created_at),
                            name: names.get(member.granted_by) ?? t("unnamed"),
                          })
                        : t("since", { date: format.date(member.created_at) })}
                    </span>
                  </div>
                  <RevokeButton name={name} userId={member.user_id} />
                </div>
                <RoleForm
                  role={member.role}
                  title={member.title}
                  userId={member.user_id}
                />
              </div>
            );
          })}
        </Panel>
      </PageBody>
    </>
  );
};

export default StaffPage;
