"use client";

import { useAuth } from "@repo/auth/provider";
import { formatPrice } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { localePath } from "@repo/internationalization";
import { formatDate } from "@repo/internationalization/format";
import {
  Link,
  usePathname,
  useRouter,
} from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import {
  isLive,
  type MyApplication,
  payable,
  unpaid,
  useApplyToProgram,
  useMyApplication,
  usePayInstallment,
  useWithdrawApplication,
} from "@/lib/programs";

const PHONE = /^\+[1-9][0-9]{7,14}$/;
const MAX_SCANS = 3;

/** The database's refusals, as message keys. */
const applyErrorKey = (error: Error | null) => {
  const message = error?.message ?? "";
  if (message.includes("date of birth")) {
    return "errors.birthday";
  }
  if (message.includes("guardian")) {
    return "errors.guardian";
  }
  if (message.includes("other ages")) {
    return "errors.ages";
  }
  if (message.includes("closed")) {
    return "errors.closed";
  }
  if (message.includes("already applied")) {
    return "errors.applied";
  }
  return "errors.failed";
};

/** The application form: an emergency contact, why, and the passport. */
const ApplyForm = ({
  passportRequired,
  programId,
}: {
  readonly passportRequired: boolean;
  readonly programId: string;
}) => {
  const t = useTranslations("web.programs.apply");
  const id = useId();
  const apply = useApplyToProgram();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+964");
  const [motivation, setMotivation] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [invalid, setInvalid] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const bad =
      !(name.trim() && PHONE.test(phone.trim())) ||
      (passportRequired && files.length === 0);
    setInvalid(bad);
    if (bad) {
      return;
    }
    apply.mutate({
      emergencyName: name.trim(),
      emergencyPhone: phone.trim(),
      files,
      motivation: motivation.trim(),
      programId,
    });
  };

  return (
    <form className="grid gap-3" noValidate onSubmit={submit}>
      <p className="text-muted-foreground text-sm">{t("fromPass")}</p>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-name`}>{t("emergencyName")}</Label>
        <Input
          id={`${id}-name`}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-phone`}>{t("emergencyPhone")}</Label>
        <Input
          dir="ltr"
          id={`${id}-phone`}
          inputMode="tel"
          onChange={(event) => setPhone(event.target.value)}
          required
          type="tel"
          value={phone}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-why`}>{t("motivation")}</Label>
        <Textarea
          id={`${id}-why`}
          maxLength={2000}
          onChange={(event) => setMotivation(event.target.value)}
          rows={4}
          value={motivation}
        />
      </div>
      {passportRequired ? (
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-passport`}>{t("passport")}</Label>
          <Input
            accept="image/png,image/jpeg,image/webp,application/pdf"
            id={`${id}-passport`}
            multiple
            onChange={(event) =>
              setFiles(Array.from(event.target.files ?? []).slice(0, MAX_SCANS))
            }
            type="file"
          />
          <p className="text-muted-foreground text-xs">{t("passportHint")}</p>
        </div>
      ) : null}
      {invalid ? (
        <p className="text-destructive text-sm" role="alert">
          {t("invalid")}
        </p>
      ) : null}
      {apply.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t(applyErrorKey(apply.error))}
        </p>
      ) : null}
      <Button className="w-full" disabled={apply.isPending} type="submit">
        {apply.isPending ? t("sending") : t("send")}
      </Button>
    </form>
  );
};

/** Pay the next installment or everything left, through the cart. */
const PayButtons = ({
  application,
}: {
  readonly application: MyApplication;
}) => {
  const t = useTranslations("web.programs.application");
  const locale = useLocale();
  const router = useRouter();
  const pay = usePayInstallment();
  const open = unpaid(application).filter(payable);
  const waiting = unpaid(application).length > open.length;
  const [next] = open;
  if (!next) {
    return waiting ? (
      <p className="text-muted-foreground text-sm">
        {t.rich("waitingPayment", {
          link: (chunks) => (
            <Link className="underline" href="/pass/orders">
              {chunks}
            </Link>
          ),
        })}
      </p>
    ) : null;
  }
  const rest = open.reduce((sum, payment) => sum + payment.amount, 0);
  const add = (everything: boolean) =>
    pay.mutate(
      { application: application.id, everything },
      { onSuccess: () => router.push("/cart") }
    );
  return (
    <div className="grid gap-2">
      <Button disabled={pay.isPending} onClick={() => add(false)}>
        {t("payNext", {
          amount: formatPrice(next.amount, locale),
          due: formatDate(next.due_on, locale),
        })}
      </Button>
      {open.length > 1 ? (
        <Button
          disabled={pay.isPending}
          onClick={() => add(true)}
          variant="outline"
        >
          {t("payAll", { amount: formatPrice(rest, locale) })}
        </Button>
      ) : null}
      {pay.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("payFailed")}
        </p>
      ) : null}
    </div>
  );
};

/** Withdraw, asked twice; what comes back follows the refund schedule. */
const WithdrawButton = ({ application }: { readonly application: string }) => {
  const t = useTranslations("web.programs.application");
  const locale = useLocale();
  const withdraw = useWithdrawApplication();
  const [asking, setAsking] = useState(false);
  if (withdraw.isSuccess) {
    return (
      <p className="text-sm" role="status">
        {withdraw.data && withdraw.data > 0
          ? t("withdrawnRefund", {
              amount: formatPrice(withdraw.data, locale),
            })
          : t("withdrawn")}
      </p>
    );
  }
  return asking ? (
    <div className="grid gap-2">
      <p className="text-sm">{t("withdrawConfirm")}</p>
      <div className="flex gap-2">
        <Button
          disabled={withdraw.isPending}
          onClick={() => withdraw.mutate(application)}
          size="sm"
          variant="destructive"
        >
          {t("withdrawYes")}
        </Button>
        <Button onClick={() => setAsking(false)} size="sm" variant="ghost">
          {t("keep")}
        </Button>
      </div>
      {withdraw.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("withdrawFailed")}
        </p>
      ) : null}
    </div>
  ) : (
    <Button onClick={() => setAsking(true)} size="sm" variant="ghost">
      {t("withdraw")}
    </Button>
  );
};

/** Where the member's application stands, and what they can do next. */
const ApplicationStatus = ({
  application,
}: {
  readonly application: MyApplication;
}) => {
  const t = useTranslations("web.programs.application");
  const locale = useLocale();
  const paid = application.payments
    .filter((payment) => payment.paid_at)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const placed =
    application.status === "accepted" || application.status === "confirmed";
  return (
    <div className="grid gap-3 rounded-md bg-muted p-4 text-sm">
      <p className="font-medium">{t(`statuses.${application.status}`)}</p>
      {application.guardian_status === "pending" ? (
        <p>{t("guardianPending")}</p>
      ) : null}
      {application.review_note ? (
        <p className="text-muted-foreground">{application.review_note}</p>
      ) : null}
      {placed && application.price !== null ? (
        <p>
          {t("paid", {
            paid: formatPrice(paid, locale),
            price: formatPrice(application.price, locale),
          })}
        </p>
      ) : null}
      {placed ? <PayButtons application={application} /> : null}
      {isLive(application.status) && application.status !== "completed" ? (
        <WithdrawButton application={application.id} />
      ) : null}
    </div>
  );
};

/** A closed application: why, and any refund. */
const EndedApplication = ({
  application,
}: {
  readonly application: MyApplication;
}) => {
  const t = useTranslations("web.programs.application");
  const locale = useLocale();
  return (
    <div className="grid gap-1 rounded-md bg-muted p-4 text-sm">
      <p className="font-medium">{t(`statuses.${application.status}`)}</p>
      {application.refund_amount ? (
        <p>
          {t(application.refunded_at ? "refunded" : "refundDue", {
            amount: formatPrice(application.refund_amount, locale),
          })}
        </p>
      ) : null}
    </div>
  );
};

/**
 * Applying to one of The IDEA's programs, and then the application: the
 * guardian's approval, the decision, paying the installments through the
 * cart and withdrawing. Signed out, it signs in and comes back here.
 */
export const ProgramApply = ({
  open,
  passportRequired,
  programId,
}: {
  /** Applications are open now. */
  readonly open: boolean;
  readonly passportRequired: boolean;
  readonly programId: string;
}) => {
  const t = useTranslations("web.programs.apply");
  const { loading, user } = useAuth();
  const locale = useLocale();
  const pathname = usePathname();
  const mine = useMyApplication(programId);

  if (!user) {
    return open ? (
      <Button asChild className="w-full" disabled={loading}>
        <Link
          href={{
            pathname: "/sign-in",
            query: { return_to: localePath(locale, pathname) },
          }}
        >
          {t("signIn")}
        </Link>
      </Button>
    ) : null;
  }
  if (mine.isPending) {
    return null;
  }
  const application = mine.data;
  if (application && isLive(application.status)) {
    return <ApplicationStatus application={application} />;
  }
  return (
    <div className="grid gap-3">
      {application ? <EndedApplication application={application} /> : null}
      {open ? (
        <>
          <h3 className="font-medium">{t("title")}</h3>
          <ApplyForm
            passportRequired={passportRequired}
            programId={programId}
          />
        </>
      ) : null}
    </div>
  );
};
