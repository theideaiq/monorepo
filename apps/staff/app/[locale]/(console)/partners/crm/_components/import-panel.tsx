"use client";

import { Label } from "@repo/design-system/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { Locale } from "@repo/internationalization";
import { useLocale, useTranslations } from "next-intl";
import { type ChangeEvent, useId, useState } from "react";
import {
  ActionForm,
  FormError,
  SubmitButton,
} from "@/components/admin/action-form";
import { Panel } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import {
  type ImportProblem,
  type ImportWarning,
  MAX_SHEET_CHARS,
  type OrgSheetRow,
  type PersonSheetRow,
  parseOrgSheet,
  parsePeopleSheet,
  type Sheet,
  type SheetProblem,
} from "@/lib/admin/partner-crm";
import { importPartnerCrm } from "../actions";

/** Preview rows rendered at once. */
const SHOWN_ROWS = 300;

type FileProblem = SheetProblem | "tooLarge" | "unreadable";

interface Loaded<Row> {
  problem: FileProblem | null;
  sheet: Sheet<Row> | null;
  text: string;
}

interface Outcome {
  failedLines: number[];
  inserted: number;
  peopleAdded: number;
  peopleFailedLines: number[];
  peopleSkipped: number;
  skipped: number;
  updated: number;
}

const readFile = async <Row,>(
  file: File,
  parse: (text: string) => Sheet<Row>
): Promise<Loaded<Row>> => {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { problem: "unreadable", sheet: null, text: "" };
  }
  if (text.length > MAX_SHEET_CHARS) {
    return { problem: "tooLarge", sheet: null, text: "" };
  }
  const sheet = parse(text);
  return { problem: sheet.problem, sheet, text };
};

/** The file's own problems and the columns we didn't recognise. */
const SheetNotes = ({
  loaded,
}: {
  readonly loaded: Loaded<unknown> | null;
}) => {
  const t = useTranslations("admin.partnerCrm.import");
  const locale = useLocale();
  const separator = locale === "ar" ? "، " : ", ";
  if (!loaded) {
    return null;
  }
  return (
    <>
      {loaded.problem ? (
        <p className="text-danger text-sm" role="alert">
          {t(`problems.${loaded.problem}`)}
        </p>
      ) : null}
      {loaded.sheet && loaded.sheet.unknownColumns.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("unknownColumns", {
            columns: loaded.sheet.unknownColumns.join(separator),
          })}
        </p>
      ) : null}
      {loaded.sheet && loaded.sheet.duplicateColumns.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("duplicateColumns", {
            columns: loaded.sheet.duplicateColumns.join(separator),
          })}
        </p>
      ) : null}
    </>
  );
};

const Problems = ({
  errors,
  warnings = [],
}: {
  readonly errors: readonly ImportProblem[];
  readonly warnings?: readonly ImportWarning[];
}) => {
  const t = useTranslations("admin.partnerCrm.import");
  if (errors.length === 0 && warnings.length === 0) {
    return <StatusBadge tone="success">{t("valid")}</StatusBadge>;
  }
  return (
    <ul className="grid gap-1 text-xs">
      {errors.map((error) => (
        <li className="text-danger" key={error}>
          {t(`reasons.${error}`)}
        </li>
      ))}
      {warnings.map((warning) => (
        <li className="text-muted-foreground" key={warning}>
          {t(`warnings.${warning}`)}
        </li>
      ))}
    </ul>
  );
};

const OrgPreview = ({ rows }: { readonly rows: readonly OrgSheetRow[] }) => {
  const t = useTranslations("admin.partnerCrm");
  const format = formatters(useLocale() as Locale);
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("import.line")}</TableHead>
            <TableHead>{t("fields.name")}</TableHead>
            <TableHead>{t("fields.website")}</TableHead>
            <TableHead>{t("fields.kind")}</TableHead>
            <TableHead>{t("fields.stage")}</TableHead>
            <TableHead>{t("fields.nextAction")}</TableHead>
            <TableHead>{t("import.result")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(0, SHOWN_ROWS).map((row) => (
            <TableRow key={row.line}>
              <TableCell className="tabular-nums">
                {format.number(row.line)}
              </TableCell>
              <TableCell>
                {row.org.name || "—"}
                {row.org.nameAr ? (
                  <span
                    className="block text-muted-foreground text-xs"
                    dir="rtl"
                  >
                    {row.org.nameAr}
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="max-w-48 truncate" dir="ltr">
                {row.org.website ?? "—"}
              </TableCell>
              <TableCell>
                {row.org.kind ? t(`kinds.${row.org.kind}`) : "—"}
              </TableCell>
              <TableCell>
                {row.org.stage ? t(`stages.${row.org.stage}`) : "—"}
              </TableCell>
              <TableCell>
                {row.org.nextAction ? (
                  <span>
                    {row.org.nextAction}
                    {row.org.nextActionOn ? (
                      <span className="block text-muted-foreground text-xs">
                        {format.date(row.org.nextActionOn)}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <Problems errors={row.errors} warnings={row.warnings} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

/** People rows: only who and for which organization (no contact details). */
const PeoplePreview = ({
  rows,
}: {
  readonly rows: readonly PersonSheetRow[];
}) => {
  const t = useTranslations("admin.partnerCrm");
  const format = formatters(useLocale() as Locale);
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("import.line")}</TableHead>
            <TableHead>{t("people.name")}</TableHead>
            <TableHead>{t("organization")}</TableHead>
            <TableHead>{t("import.result")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(0, SHOWN_ROWS).map((row) => (
            <TableRow key={row.line}>
              <TableCell className="tabular-nums">
                {format.number(row.line)}
              </TableCell>
              <TableCell>{row.person.name || "—"}</TableCell>
              <TableCell dir="auto">
                {row.person.orgWebsite ?? row.person.orgName ?? "—"}
              </TableCell>
              <TableCell>
                <Problems errors={row.errors} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const FilePicker = ({
  hint,
  label,
  onChange,
}: {
  readonly hint: string;
  readonly label: string;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) => {
  const id = useId();
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      <input
        accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
        className="text-sm file:me-3 file:rounded-md file:border file:bg-transparent file:px-3 file:py-1.5 file:font-medium file:text-sm"
        id={id}
        onChange={onChange}
        type="file"
      />
      <p className="text-muted-foreground text-xs">{hint}</p>
    </div>
  );
};

/** What the import did, and the lines the database refused. */
const OutcomeNote = ({
  outcome,
  withPeople,
}: {
  readonly outcome: Outcome;
  readonly withPeople: boolean;
}) => {
  const t = useTranslations("admin.partnerCrm.import");
  const locale = useLocale() as Locale;
  const format = formatters(locale);
  const failed = [...outcome.failedLines, ...outcome.peopleFailedLines];
  return (
    <div className="grid gap-1 text-sm" role="status">
      <p>
        {t("done", {
          inserted: format.number(outcome.inserted),
          skipped: format.number(outcome.skipped),
          updated: format.number(outcome.updated),
        })}
      </p>
      {withPeople ? (
        <p>
          {t("peopleDone", {
            added: format.number(outcome.peopleAdded),
            skipped: format.number(outcome.peopleSkipped),
          })}
        </p>
      ) : null}
      {failed.length > 0 ? (
        <p className="text-danger">
          {t("failedLines", {
            lines: failed
              .map((line) => format.number(line))
              .join(locale === "ar" ? "، " : ", "),
          })}
        </p>
      ) : null}
    </div>
  );
};

/**
 * The outreach workbook's import: choose its CSV export (and, if there is
 * one, the people sheet), check every row in the preview, then import the
 * valid ones. Nothing is sent until "Import".
 */
export const ImportPanel = () => {
  const t = useTranslations("admin.partnerCrm.import");
  const format = formatters(useLocale() as Locale);
  const [orgs, setOrgs] = useState<Loaded<OrgSheetRow> | null>(null);
  const [people, setPeople] = useState<Loaded<PersonSheetRow> | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const choose =
    <Row,>(
      parse: (text: string) => Sheet<Row>,
      set: (value: Loaded<Row> | null) => void
    ) =>
    async (event: ChangeEvent<HTMLInputElement>) => {
      setOutcome(null);
      const file = event.target.files?.[0];
      set(file ? await readFile(file, parse) : null);
    };

  const orgRows = orgs?.sheet?.problem ? [] : (orgs?.sheet?.rows ?? []);
  const peopleRows = people?.sheet?.problem ? [] : (people?.sheet?.rows ?? []);
  const validOrgs = orgRows.filter((row) => row.errors.length === 0).length;
  const validPeople = peopleRows.filter(
    (row) => row.errors.length === 0
  ).length;
  const ready =
    Boolean(orgs?.text) &&
    !orgs?.problem &&
    !people?.problem &&
    validOrgs + validPeople > 0;

  return (
    <div className="grid gap-6">
      <Panel description={t("description")} title={t("title")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FilePicker
            hint={t("orgsHint")}
            label={t("orgsFile")}
            onChange={choose(parseOrgSheet, setOrgs)}
          />
          <FilePicker
            hint={t("peopleHint")}
            label={t("peopleFile")}
            onChange={choose(parsePeopleSheet, setPeople)}
          />
        </div>
        <SheetNotes loaded={orgs} />
        <SheetNotes loaded={people} />
        {orgRows.length > 0 || peopleRows.length > 0 ? (
          <p className="text-sm" role="status">
            {t("counts", {
              invalid: format.number(orgRows.length - validOrgs),
              people: format.number(validPeople),
              peopleInvalid: format.number(peopleRows.length - validPeople),
              valid: format.number(validOrgs),
            })}
          </p>
        ) : null}
        <ActionForm
          action={importPartnerCrm}
          onSuccess={(state) =>
            setOutcome((state.data ?? null) as Outcome | null)
          }
          silent
        >
          <input name="orgs" type="hidden" value={orgs?.text ?? ""} />
          {people?.text ? (
            <input name="people" type="hidden" value={people.text} />
          ) : null}
          <FormError />
          <div className="flex justify-end">
            <SubmitButton disabled={!ready}>{t("run")}</SubmitButton>
          </div>
        </ActionForm>
        {outcome ? (
          <OutcomeNote outcome={outcome} withPeople={Boolean(people?.text)} />
        ) : null}
      </Panel>
      {orgRows.length > 0 ? (
        <Panel
          description={
            orgRows.length > SHOWN_ROWS
              ? t("shown", {
                  shown: format.number(SHOWN_ROWS),
                  total: format.number(orgRows.length),
                })
              : undefined
          }
          title={t("orgsPreview")}
        >
          <OrgPreview rows={orgRows} />
        </Panel>
      ) : null}
      {peopleRows.length > 0 ? (
        <Panel title={t("peoplePreview")}>
          <PeoplePreview rows={peopleRows} />
        </Panel>
      ) : null}
    </div>
  );
};
