"use client";

import { Link } from "@repo/internationalization/navigation";
import { MoveLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { StudentSection } from "@/components/student-settings";
import {
  EducatorSection,
  IdentitySection,
} from "@/components/verification-settings";
import { VERIFY_KINDS, type VerifyKind } from "@/lib/verify-kinds";

/** An organization is verified in Partners, by the people who run it. */
const OrganizationSection = ({
  partnersUrl,
}: {
  readonly partnersUrl: string;
}) => {
  const t = useTranslations("pass.verify.hub.organization");
  return (
    <section aria-labelledby="verify-organization" className="grid gap-3">
      <div>
        <h2 className="font-medium" id="verify-organization">
          {t("title")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <a className="text-pink-text text-sm hover:underline" href={partnersUrl}>
        {t("open")}
      </a>
    </section>
  );
};

/**
 * /verify for a Pass: every verification in one place, one kind at a time
 * (`?kind=student|educator|identity|organization`).
 */
export const VerificationHub = ({
  kind,
  partnersUrl,
  returnTo,
}: {
  readonly kind: VerifyKind;
  readonly partnersUrl: string;
  readonly returnTo: string | null;
}) => {
  const t = useTranslations("pass.verify.hub");
  return (
    <div className="grid gap-6">
      <div className="grid gap-1 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <nav aria-label={t("kinds")} className="flex flex-wrap gap-2">
        {VERIFY_KINDS.map((option) => (
          <Link
            aria-current={option === kind ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm ${
              option === kind
                ? "border-foreground bg-foreground text-background"
                : "hover:bg-muted"
            }`}
            href={{
              pathname: "/verify",
              query: returnTo
                ? { kind: option, return_to: returnTo }
                : { kind: option },
            }}
            key={option}
            replace
          >
            {t(`tabs.${option}`)}
          </Link>
        ))}
      </nav>
      {kind === "student" ? <StudentSection /> : null}
      {kind === "educator" ? <EducatorSection /> : null}
      {kind === "identity" ? <IdentitySection /> : null}
      {kind === "organization" ? (
        <OrganizationSection partnersUrl={partnersUrl} />
      ) : null}
      {returnTo ? (
        <a className="text-center text-sm underline" href={returnTo}>
          {t("continue")}
        </a>
      ) : (
        <Link
          className="inline-flex items-center justify-center gap-2 text-muted-foreground text-sm hover:text-foreground"
          href="/pass/settings"
        >
          <MoveLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {t("back")}
        </Link>
      )}
    </div>
  );
};
