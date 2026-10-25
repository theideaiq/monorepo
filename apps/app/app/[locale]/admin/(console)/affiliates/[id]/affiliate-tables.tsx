import type { Enums } from "@repo/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { getLocale, getTranslations } from "next-intl/server";
import { DetailList, Panel } from "@/components/admin/page";
import { AFFILIATE_MIN_PAYOUT } from "@/lib/admin/affiliates";
import { formatters } from "@/lib/admin/format";
import { RecordPayoutForm } from "../affiliate-forms";

const commissionState = (row: {
  available_at: string;
  status: Enums<"affiliate_commission_status">;
}) => {
  if (row.status !== "pending") {
    return row.status;
  }
  return new Date(row.available_at) > new Date() ? "holding" : "ready";
};

/** Every commission: what earned it, where it stands, how much. */
export const CommissionsPanel = async ({
  rows,
}: {
  readonly rows: {
    amount: number;
    available_at: string;
    created_at: string;
    id: string;
    kind: Enums<"affiliate_commission_kind">;
    status: Enums<"affiliate_commission_status">;
  }[];
}) => {
  const t = await getTranslations("admin.affiliates");
  const format = formatters(await getLocale());
  return (
    <Panel title={t("commissions")}>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noCommissions")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("kind")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("amount")}</TableHead>
              <TableHead>{t("date")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{t(`kinds.${row.kind}`)}</TableCell>
                <TableCell>{t(`states.${commissionState(row)}`)}</TableCell>
                <TableCell className="tabular-nums">
                  {format.money(row.amount)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {format.date(row.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
};

/** What was paid out, how and when. */
export const PayoutsPanel = async ({
  rows,
}: {
  readonly rows: {
    amount: number;
    bulbs: number | null;
    created_at: string;
    id: string;
    method: Enums<"affiliate_payout_method">;
    reference: string | null;
  }[];
}) => {
  if (rows.length === 0) {
    return null;
  }
  const t = await getTranslations("admin.affiliates");
  const tMethods = await getTranslations("app.affiliate.methods");
  const format = formatters(await getLocale());
  return (
    <Panel title={t("payouts")}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("method")}</TableHead>
            <TableHead>{t("reference")}</TableHead>
            <TableHead>{t("amount")}</TableHead>
            <TableHead>{t("date")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{tMethods(row.method)}</TableCell>
              <TableCell dir="ltr">
                {row.bulbs
                  ? t("bulbsCredited", {
                      bulbs: format.number(row.bulbs),
                    })
                  : (row.reference ?? "—")}
              </TableCell>
              <TableCell className="tabular-nums">
                {format.money(row.amount)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {format.date(row.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
};

/** What the affiliate has earned and, for finance, the payout. */
export const BalancePanel = async ({
  account,
  canPay,
  method,
  money,
  userId,
}: {
  readonly account: string | null;
  readonly canPay: boolean;
  readonly method: Enums<"affiliate_payout_method">;
  readonly money?: { available: number; paid: number; pending: number };
  readonly userId: string;
}) => {
  const t = await getTranslations("admin.affiliates");
  const tMethods = await getTranslations("app.affiliate.methods");
  const format = formatters(await getLocale());
  const ready = money?.available ?? 0;
  return (
    <Panel title={t("balance")}>
      <DetailList
        items={[
          { label: t("ready"), value: format.money(ready) },
          {
            label: t("holding"),
            value: format.money(money?.pending ?? 0),
          },
          { label: t("paid"), value: format.money(money?.paid ?? 0) },
          {
            label: t("payoutMethod"),
            value: (
              <>
                {tMethods(method)}
                {account ? (
                  <span className="block" dir="ltr">
                    {account}
                  </span>
                ) : null}
              </>
            ),
          },
        ]}
      />
      {canPay && ready >= AFFILIATE_MIN_PAYOUT ? (
        <RecordPayoutForm bulbs={method === "bulbs"} userId={userId} />
      ) : (
        <p className="text-muted-foreground text-sm">
          {t("payoutRule", {
            minimum: format.money(AFFILIATE_MIN_PAYOUT),
          })}
        </p>
      )}
    </Panel>
  );
};
