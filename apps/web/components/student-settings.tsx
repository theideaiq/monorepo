"use client";

import { governorates, localized } from "@repo/commerce";
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
import type { Locale } from "@repo/internationalization";
import { formatCalendarDate } from "@repo/internationalization/format";
import { GraduationCapIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  useConfirmStudentEmail,
  useMyStudent,
  useRequestStudentReview,
  useSendStudentCode,
  useUniversities,
} from "@/lib/student-queries";
import { confirmError, studentCodeError } from "@/lib/students";
import { useSetStudentProfile, useStudentProfile } from "@/lib/survey-queries";

const day = (value: string, locale: Locale) =>
  formatCalendarDate(new Date(`${value}T12:00:00`), locale);

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs";

/** A university email: a code is emailed to it and typed back here. */
export const EmailForm = ({
  onVerified,
  university,
}: {
  readonly onVerified?: () => void;
  readonly university: string;
}) => {
  const t = useTranslations("app.settings.student");
  const locale = useLocale();
  const id = useId();
  const send = useSendStudentCode();
  const confirm = useConfirmStudentEmail();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const sendCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send.mutate({ email, locale, university });
  };
  const confirmCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    confirm.mutate(code.trim(), { onSuccess: () => onVerified?.() });
  };

  if (send.isSuccess) {
    return (
      <form className="grid gap-3" onSubmit={confirmCode}>
        <p className="text-sm">{t("codeSent", { email })}</p>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-code`}>{t("code")}</Label>
          <Input
            autoComplete="one-time-code"
            className="w-48"
            dir="ltr"
            id={`${id}-code`}
            inputMode="numeric"
            maxLength={8}
            onChange={(event) => setCode(event.target.value)}
            required
            value={code}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={confirm.isPending || code.length < 8} type="submit">
            {t("confirm")}
          </Button>
          <Button onClick={() => send.reset()} type="button" variant="ghost">
            {t("changeEmail")}
          </Button>
        </div>
        {confirm.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t(`errors.${confirmError(confirm.error.message)}`)}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <form className="grid gap-3" onSubmit={sendCode}>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-email`}>{t("email")}</Label>
        <Input
          autoComplete="email"
          dir="ltr"
          id={`${id}-email`}
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>
      <div>
        <Button disabled={send.isPending || !email} type="submit">
          {t("sendCode")}
        </Button>
      </div>
      {send.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t(
            `errors.${studentCodeError(send.error instanceof ApiError ? send.error.code : undefined)}`
          )}
        </p>
      ) : null}
    </form>
  );
};

/** A photo of the student card, reviewed by The IDEA's team. */
export const CardForm = ({
  onSent,
  university,
}: {
  readonly onSent?: () => void;
  readonly university: string;
}) => {
  const t = useTranslations("app.settings.student");
  const id = useId();
  const review = useRequestStudentReview();
  const [photo, setPhoto] = useState<File | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (photo) {
      review.mutate({ photo, university }, { onSuccess: () => onSent?.() });
    }
  };

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-photo`}>{t("photo")}</Label>
        <Input
          accept="image/png,image/jpeg,image/webp"
          id={`${id}-photo`}
          onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
          required
          type="file"
        />
        <p className="text-muted-foreground text-xs">{t("photoNote")}</p>
      </div>
      <div>
        <Button disabled={review.isPending || !photo} type="submit">
          {t("sendPhoto")}
        </Button>
      </div>
      {review.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("errors.failed")}
        </p>
      ) : null}
    </form>
  );
};

const YEARS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Optional: major, year of study and governorate, for survey targeting. */
const ProfileForm = ({
  initial,
}: {
  readonly initial: {
    governorate: string | null;
    major: string | null;
    study_year: number | null;
  } | null;
}) => {
  const t = useTranslations("app.settings.student.profile");
  const locale = useLocale();
  const id = useId();
  const save = useSetStudentProfile();
  const [major, setMajor] = useState(initial?.major ?? "");
  const [year, setYear] = useState(
    initial?.study_year ? String(initial.study_year) : ""
  );
  const [governorate, setGovernorate] = useState(initial?.governorate ?? "");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate({ governorate, major, year: year ? Number(year) : null });
  };

  return (
    <form className="grid gap-3 border-t pt-4" onSubmit={submit}>
      <div>
        <p className="font-medium text-sm">{t("title")}</p>
        <p className="text-muted-foreground text-xs">{t("description")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-major`}>{t("major")}</Label>
          <Input
            id={`${id}-major`}
            maxLength={80}
            onChange={(event) => setMajor(event.target.value)}
            value={major}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-year`}>{t("year")}</Label>
          <select
            className={selectClassName}
            id={`${id}-year`}
            onChange={(event) => setYear(event.target.value)}
            value={year}
          >
            <option value="">{t("notSaid")}</option>
            {YEARS.map((value) => (
              <option key={value} value={value}>
                {t("yearN", { n: String(value) })}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-governorate`}>{t("governorate")}</Label>
          <select
            className={selectClassName}
            id={`${id}-governorate`}
            onChange={(event) => setGovernorate(event.target.value)}
            value={governorate}
          >
            <option value="">{t("notSaid")}</option>
            {governorates.map((row) => (
              <option key={row.id} value={row.id}>
                {locale === "en" ? row.en : row.ar}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button disabled={save.isPending} size="sm" type="submit">
          {t("save")}
        </Button>
        {save.isSuccess ? (
          <span className="text-muted-foreground text-sm" role="status">
            {t("saved")}
          </span>
        ) : null}
        {save.isError ? (
          <span className="text-destructive text-sm" role="alert">
            {t("failed")}
          </span>
        ) : null}
      </div>
    </form>
  );
};

/**
 * The university email on file (shared only with partner sites the
 * student allows), or a way to add it: badges from card photos, or from
 * before emails were kept, have none.
 */
const UniversityEmail = ({
  email,
  university,
}: {
  readonly email: string | null | undefined;
  readonly university: string;
}) => {
  const t = useTranslations("app.settings.student");
  if (email) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("emailOnFile", { email })}
      </p>
    );
  }
  return (
    <div className="grid gap-2 border-t pt-4">
      <p className="text-muted-foreground text-sm">{t("addEmail")}</p>
      <EmailForm university={university} />
    </div>
  );
};

/** The profile form and the university email, once the saved values are in. */
const StudentProfile = ({ university }: { readonly university: string }) => {
  const profile = useStudentProfile();
  if (!profile.isSuccess) {
    return null;
  }
  return (
    <>
      <UniversityEmail
        email={profile.data?.university_email}
        university={university}
      />
      <ProfileForm initial={profile.data} />
    </>
  );
};

/** Choose the university, then verify by email or with the card. */
const VerifyForms = () => {
  const t = useTranslations("app.settings.student");
  const locale = useLocale();
  const id = useId();
  const universities = useUniversities();
  const [university, setUniversity] = useState("");
  const [method, setMethod] = useState<"card" | "email">("email");

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={`${id}-university`}>{t("university")}</Label>
        <select
          className={selectClassName}
          id={`${id}-university`}
          onChange={(event) => setUniversity(event.target.value)}
          value={university}
        >
          <option value="">{t("chooseUniversity")}</option>
          {(universities.data ?? []).map((row) => (
            <option key={row.id} value={row.id}>
              {localized(row, "name", locale)}
            </option>
          ))}
        </select>
      </div>
      {university ? (
        <>
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">{t("how")}</legend>
            {(["email", "card"] as const).map((value) => (
              <Button
                aria-pressed={method === value}
                key={value}
                onClick={() => setMethod(value)}
                size="sm"
                type="button"
                variant={method === value ? "default" : "outline"}
              >
                {t(value === "email" ? "byEmail" : "byCard")}
              </Button>
            ))}
          </fieldset>
          {method === "email" ? (
            <EmailForm key={university} university={university} />
          ) : (
            <CardForm university={university} />
          )}
        </>
      ) : null}
    </div>
  );
};

/**
 * Your Pass → Settings: verify as a student with a university email (or a
 * student card photo our team checks). The badge lasts until the end of
 * the academic year and brings the Plus student price, no deposits and
 * student perks.
 */
export const StudentCard = () => {
  const t = useTranslations("app.settings.student");
  const locale = useLocale() as Locale;
  const status = useMyStudent();
  const universities = useUniversities();

  if (status.isPending || status.isError) {
    return null;
  }
  const student = status.data;
  const universityName = (universityId: string | null | undefined) => {
    const row = universities.data?.find((u) => u.id === universityId);
    return row ? localized(row, "name", locale) : "";
  };

  let body = <VerifyForms />;
  if (student?.verified && student.valid_until) {
    body = (
      <>
        <p className="text-sm">
          {t("verified", {
            date: day(student.valid_until, locale),
            university: universityName(student.university_id),
          })}
        </p>
        <StudentProfile university={student.university_id ?? ""} />
      </>
    );
  } else if (student?.pending === "card") {
    body = <p className="text-sm">{t("waiting")}</p>;
  }

  return (
    <Card id="student">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCapIcon
            aria-hidden="true"
            className="size-5 text-pink-text"
          />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {!student?.verified && student?.valid_until ? (
          <p className="text-muted-foreground text-sm">
            {t("ended", { date: day(student.valid_until, locale) })}
          </p>
        ) : null}
        {!(student?.verified || student?.pending) &&
        student?.rejected_reason ? (
          <p className="text-destructive text-sm">
            {t("rejected", { reason: student.rejected_reason })}
          </p>
        ) : null}
        {body}
      </CardContent>
    </Card>
  );
};
