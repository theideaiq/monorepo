import { describe, expect, test } from "vitest";
import {
  COUNTRY_CODES,
  contactKey,
  dealSchema,
  dueState,
  isFiltered,
  mapHeaders,
  normalizeHeader,
  ORG_ALIASES,
  ORG_COLUMNS,
  orgRow,
  orgSchema,
  parseCountry,
  parseCrmFilter,
  parseIsoDate,
  parseKind,
  parseOrgSheet,
  parsePeopleSheet,
  parsePriority,
  parseStage,
  parseTags,
  parseUrl,
  personOrg,
  personSchema,
  planImport,
  splitRange,
  touchNextAction,
  touchSchema,
} from "./partner-crm";

// Made-up organizations and people: no real contacts in tests.
const ORG = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";

const csv = (...lines: string[]) => lines.join("\n");

describe("countries", () => {
  test("every ISO 3166-1 alpha-2 code, and nothing else", () => {
    expect(COUNTRY_CODES.size).toBe(249);
    expect(parseCountry("iq")).toBe("IQ");
    expect(parseCountry(" DE ")).toBe("DE");
    expect(parseCountry("ZZ")).toBeNull();
    expect(parseCountry("UK")).toBeNull();
    expect(parseCountry("DEU")).toBeNull();
    expect(parseCountry("")).toBeNull();
  });

  test("names in English or Arabic, and the common short ones", () => {
    expect(parseCountry("Germany")).toBe("DE");
    expect(parseCountry("germany")).toBe("DE");
    expect(parseCountry("ألمانيا")).toBe("DE");
    expect(parseCountry("United Kingdom")).toBe("GB");
    expect(parseCountry("usa")).toBe("US");
    expect(parseCountry("Atlantis")).toBeNull();
  });
});

describe("web addresses", () => {
  test("http(s) as written, a bare domain gets https://", () => {
    expect(parseUrl("https://example.org/about", 500)).toBe(
      "https://example.org/about"
    );
    expect(parseUrl("http://example.org", 500)).toBe("http://example.org");
    expect(parseUrl("example.org", 500)).toBe("https://example.org");
    expect(parseUrl("www.example.edu.iq/en", 500)).toBe(
      "https://www.example.edu.iq/en"
    );
  });

  test("refuses anything else", () => {
    expect(parseUrl("ftp://example.org", 500)).toBeNull();
    expect(parseUrl("javascript:alert(1)", 500)).toBeNull();
    expect(parseUrl("not a site", 500)).toBeNull();
    expect(parseUrl("https://localhost", 500)).toBeNull();
    expect(parseUrl(`https://example.org/${"a".repeat(600)}`, 500)).toBeNull();
  });
});

describe("dates", () => {
  test("ISO dates only, real ones", () => {
    expect(parseIsoDate("2026-11-04")).toBe("2026-11-04");
    expect(parseIsoDate("2026/1/5")).toBe("2026-01-05");
    expect(parseIsoDate("2026-11-04 00:00:00")).toBe("2026-11-04");
    expect(parseIsoDate("2026-02-30")).toBeNull();
    expect(parseIsoDate("04/11/2026")).toBeNull();
    expect(parseIsoDate("next week")).toBeNull();
  });

  test("due today, overdue or later", () => {
    expect(dueState("2026-11-03", "2026-11-04")).toBe("overdue");
    expect(dueState("2026-11-04", "2026-11-04")).toBe("today");
    expect(dueState("2026-11-05", "2026-11-04")).toBe("upcoming");
    expect(dueState(null, "2026-11-04")).toBeNull();
  });
});

describe("the sheet's words", () => {
  test("stages and their synonyms", () => {
    expect(parseStage("Prospect")).toBe("prospect");
    expect(parseStage("in talks")).toBe("talking");
    expect(parseStage("On hold")).toBe("paused");
    expect(parseStage("not-interested")).toBe("declined");
    expect(parseStage("Signed")).toBe("partner");
    expect(parseStage("maybe")).toBeNull();
  });

  test("priorities", () => {
    expect(parsePriority("1")).toBe(1);
    expect(parsePriority("High")).toBe(1);
    expect(parsePriority("medium")).toBe(2);
    expect(parsePriority("P3")).toBe(3);
    expect(parsePriority("4")).toBeNull();
    expect(parsePriority("urgent")).toBeNull();
  });

  test("an unknown kind becomes other, a blank one stays blank", () => {
    expect(parseKind("University")).toEqual({
      kind: "university",
      known: true,
    });
    expect(parseKind("cultural centre")).toEqual({
      kind: "cultural_centre",
      known: true,
    });
    expect(parseKind("Consulate")).toEqual({ kind: "embassy", known: true });
    expect(parseKind("Space agency")).toEqual({ kind: "other", known: false });
    expect(parseKind(" ")).toBeNull();
  });

  test("tags split on commas (Arabic too), semicolons and bars", () => {
    expect(parseTags("STEM, Erasmus، stem; Visit | ")).toEqual([
      "stem",
      "erasmus",
      "visit",
    ]);
  });
});

describe("headers", () => {
  test("normalized and mapped through the aliases", () => {
    expect(normalizeHeader(" Next Action (date) ")).toBe("next_action_date");
    const map = mapHeaders(
      [
        "Organization",
        "Arabic name",
        "Type",
        "Country code",
        "URL",
        "Status",
        "Next step",
        "Follow-up date",
        "Source",
        "Labels",
        "Comments",
        "Phone",
        "Website",
      ],
      ORG_COLUMNS,
      ORG_ALIASES
    );
    expect(map.index).toEqual({
      country: 3,
      kind: 2,
      name: 0,
      name_ar: 1,
      next_action: 6,
      next_action_on: 7,
      notes: 10,
      source_url: 8,
      stage: 5,
      tags: 9,
      website: 4,
    });
    expect(map.unknown).toEqual(["Phone"]);
    expect(map.duplicates).toEqual(["Website"]);
  });
});

describe("the organizations sheet", () => {
  const header =
    "name,name_ar,kind,country,city,website,email,stage,priority,next_action,next_action_on,source_url,tags,notes";

  test("reads a valid row", () => {
    const sheet = parseOrgSheet(
      csv(
        header,
        'Example University,جامعة مثال,university,DE,Berlin,example.edu,info@example.edu,contacted,high,Send the deck,2026-11-10,https://example.org/list,"stem, visit",Met at a fair'
      )
    );
    expect(sheet.problem).toBeNull();
    expect(sheet.rows).toHaveLength(1);
    const [row] = sheet.rows;
    expect(row?.errors).toEqual([]);
    expect(row?.line).toBe(2);
    expect(row?.org).toEqual({
      city: "Berlin",
      country: "DE",
      email: "info@example.edu",
      kind: "university",
      name: "Example University",
      nameAr: "جامعة مثال",
      nextAction: "Send the deck",
      nextActionOn: "2026-11-10",
      notes: "Met at a fair",
      priority: 1,
      sourceUrl: "https://example.org/list",
      stage: "contacted",
      tags: ["stem", "visit"],
      website: "https://example.edu",
    });
  });

  test("never invents: blank cells stay null", () => {
    const [row] = parseOrgSheet(csv("Organization", "Example Org")).rows;
    expect(row?.errors).toEqual([]);
    expect(row?.org).toMatchObject({
      country: null,
      kind: null,
      priority: null,
      stage: null,
      tags: [],
      website: null,
    });
  });

  test("says what's wrong with each row", () => {
    const sheet = parseOrgSheet(
      csv(
        header,
        ",,,XX,,not a site,nope,maybe,9,,,ftp://x,,",
        "Example B,,thing,,,,,,,Call,,,,",
        "Example C,,,,,,,,,,2026-11-31,,,",
        "Example D,,,,,,,,,,2026-12-01,,,"
      )
    );
    expect(sheet.rows.map((row) => row.errors)).toEqual([
      [
        "nameMissing",
        "countryInvalid",
        "websiteInvalid",
        "emailInvalid",
        "stageUnknown",
        "priorityInvalid",
        "sourceUrlInvalid",
      ],
      ["nextActionWithoutDate"],
      ["dateInvalid", "dateWithoutNextAction"],
      ["dateWithoutNextAction"],
    ]);
    expect(sheet.rows[1]?.warnings).toEqual(["kindUnknown"]);
    expect(sheet.rows[1]?.org.kind).toBe("other");
  });

  test("flags repeats within the file", () => {
    const sheet = parseOrgSheet(
      csv(
        "name,website",
        "Example A,https://Example.org",
        "Example A (again),example.org",
        "Example B,",
        "Example B,",
        "Example B,https://b.example.org"
      )
    );
    expect(sheet.rows.map((row) => row.errors)).toEqual([
      [],
      ["duplicateInFile"],
      [],
      ["duplicateInFile"],
      [],
    ]);
  });

  test("an empty file, or one without a name column", () => {
    expect(parseOrgSheet("").problem).toBe("empty");
    expect(parseOrgSheet(csv("name", "", " ")).problem).toBe("empty");
    expect(parseOrgSheet(csv("website", "example.org")).problem).toBe(
      "noNameColumn"
    );
  });

  test("too many or too long tags", () => {
    const many = Array.from({ length: 21 }, (_, index) => `t${index}`).join(
      ";"
    );
    const [row] = parseOrgSheet(
      csv("name,tags", `Example,"${many},${"x".repeat(41)}"`)
    ).rows;
    expect(row?.errors).toEqual(["tooManyTags", "tagTooLong"]);
  });
});

describe("the people sheet", () => {
  test("names the organization and the source", () => {
    const sheet = parsePeopleSheet(
      csv(
        "Organization,Website,Contact,Title,Email,Mobile,Source",
        "Example University,example.edu,A. Person,Head of exchange,a@example.edu,+964 ٧٧٠ 000 0000,The university's staff page",
        ",,B. Person,,b@,12,",
        "Example University,example.edu,A. Person,,a@example.edu,,Card"
      )
    );
    expect(sheet.problem).toBeNull();
    expect(sheet.rows[0]?.errors).toEqual([]);
    expect(sheet.rows[0]?.person).toMatchObject({
      orgName: "Example University",
      orgWebsite: "https://example.edu",
      phone: "+964 770 000 0000",
      role: "Head of exchange",
    });
    expect(sheet.rows[1]?.errors).toEqual([
      "orgMissing",
      "emailInvalid",
      "phoneInvalid",
      "sourceMissing",
    ]);
    expect(sheet.rows[2]?.errors).toEqual(["duplicateInFile"]);
  });

  test("needs an organization column, a name and a source", () => {
    expect(parsePeopleSheet(csv("name,source", "A,B")).problem).toBe(
      "noOrgColumn"
    );
    expect(parsePeopleSheet(csv("organization,name", "A,B")).problem).toBe(
      "noPersonColumns"
    );
  });

  test("one contact per organization, by email (any case) or name", () => {
    expect(contactKey(ORG, { email: "A@Example.edu", name: "A" })).toBe(
      contactKey(ORG, { email: "a@example.edu", name: "B" })
    );
    expect(contactKey(ORG, { email: null, name: "A" })).not.toBe(
      contactKey(OTHER, { email: null, name: "A" })
    );
  });

  test("finds its organization by website, else by name", () => {
    const orgs = [
      { id: ORG, name: "Example A", tags: [], website: "https://A.example" },
      { id: OTHER, name: "Example B", tags: [], website: null },
    ];
    expect(
      personOrg({ orgName: null, orgWebsite: "https://a.example" }, orgs)?.id
    ).toBe(ORG);
    expect(
      personOrg({ orgName: "Example B", orgWebsite: null }, orgs)?.id
    ).toBe(OTHER);
    expect(personOrg({ orgName: "Nobody", orgWebsite: null }, orgs)).toBeNull();
  });
});

describe("planning the import", () => {
  const existing = [
    {
      id: ORG,
      name: "Example A",
      tags: ["old"],
      website: "https://www.Example-A.org",
    },
    { id: OTHER, name: "Example B", tags: [], website: null },
  ];

  test("updates by website (any case), else by exact name, else adds", () => {
    const sheet = parseOrgSheet(
      csv(
        "name,website,stage,tags,city",
        "Renamed A,https://www.example-a.org,talking,new,",
        "Example B,b.example.org,,,Basra",
        "example b,,,,",
        "Example C,,,,",
        "Broken,not a site,,,"
      )
    );
    const plan = planImport(sheet.rows, existing);
    expect(plan.updates).toEqual([
      {
        columns: {
          name: "Renamed A",
          stage: "talking",
          tags: ["old", "new"],
        },
        id: ORG,
        line: 2,
      },
      {
        columns: {
          city: "Basra",
          name: "Example B",
          website: "https://b.example.org",
        },
        id: OTHER,
        line: 3,
      },
    ]);
    // Names match exactly; a row with an error is skipped.
    expect(plan.inserts.map((insert) => insert.columns.name)).toEqual([
      "example b",
      "Example C",
    ]);
  });

  test("a namesake with another website is a new organization", () => {
    const sheet = parseOrgSheet(
      csv("name,website", "Example A,https://elsewhere.example")
    );
    const plan = planImport(sheet.rows, existing);
    expect(plan.updates).toEqual([]);
    expect(plan.inserts).toHaveLength(1);
  });

  test("the next action is set only with its date", () => {
    const sheet = parseOrgSheet(
      csv("name,next_action,next_action_on", "Example C,Call,2026-11-10")
    );
    expect(planImport(sheet.rows, []).inserts[0]?.columns).toEqual({
      name: "Example C",
      next_action: "Call",
      next_action_on: "2026-11-10",
    });
  });
});

describe("the forms", () => {
  const org = {
    kind: "university",
    name: " Example University ",
    priority: "2",
    stage: "prospect",
  };

  test("an organization, empty fields as null", () => {
    const parsed = orgSchema.parse({
      ...org,
      country: "de",
      tags: "STEM, visit",
    });
    expect(orgRow(parsed)).toMatchObject({
      country: "DE",
      name: "Example University",
      next_action: null,
      owner_id: null,
      priority: 2,
      tags: ["stem", "visit"],
      website: null,
    });
  });

  test("the next action and its date go together", () => {
    expect(
      orgSchema.safeParse({ ...org, nextAction: "Call" }).error?.issues[0]?.path
    ).toEqual(["nextActionOn"]);
    expect(
      orgSchema.safeParse({ ...org, nextActionOn: "2026-11-10" }).error
        ?.issues[0]?.path
    ).toEqual(["nextAction"]);
    expect(
      orgSchema.safeParse({
        ...org,
        nextAction: "Call",
        nextActionOn: "2026-11-10",
      }).success
    ).toBe(true);
  });

  test("refuses a bad country, website or priority", () => {
    expect(orgSchema.safeParse({ ...org, country: "XX" }).success).toBe(false);
    expect(
      orgSchema.safeParse({ ...org, website: "example.org" }).success
    ).toBe(false);
    expect(orgSchema.safeParse({ ...org, priority: "4" }).success).toBe(false);
  });

  test("a person needs a name and a source", () => {
    const person = { name: "A. Person", orgId: ORG, source: "Staff page" };
    expect(
      personSchema.parse({ ...person, phone: "٠٧٧٠ 000 0000" }).phone
    ).toBe("0770 000 0000");
    expect(personSchema.safeParse({ ...person, source: " " }).success).toBe(
      false
    );
    expect(personSchema.safeParse({ ...person, email: "a@b" }).success).toBe(
      false
    );
  });

  test("a deal's value is in steps of 250 IQD", () => {
    const deal = {
      kind: "delegation",
      orgId: ORG,
      stage: "idea",
      title: "Visit",
    };
    expect(dealSchema.parse({ ...deal, valueIqd: "1,250,000" }).valueIqd).toBe(
      1_250_000
    );
    expect(dealSchema.parse({ ...deal, valueIqd: "" }).valueIqd).toBeNull();
    expect(dealSchema.safeParse({ ...deal, valueIqd: "1,100" }).success).toBe(
      false
    );
    expect(dealSchema.safeParse({ ...deal, valueIqd: "-250" }).success).toBe(
      false
    );
  });

  test("a touch can set or clear the next action", () => {
    const touch = {
      channel: "email",
      direction: "outbound",
      happenedAt: "2026-11-04T10:00",
      orgId: ORG,
      summary: "Sent the deck",
    };
    const plain = touchSchema.parse(touch);
    expect(plain.happenedAt).toBe("2026-11-04T07:00:00.000Z");
    expect(touchNextAction(plain)).toBeNull();
    expect(
      touchNextAction(
        touchSchema.parse({
          ...touch,
          nextAction: "Follow up",
          nextActionOn: "2026-11-11",
        })
      )
    ).toEqual({ next_action: "Follow up", next_action_on: "2026-11-11" });
    expect(
      touchNextAction(touchSchema.parse({ ...touch, clearNextAction: "on" }))
    ).toEqual({ next_action: null, next_action_on: null });
    expect(
      touchSchema.safeParse({ ...touch, nextAction: "Follow up" }).success
    ).toBe(false);
    expect(
      touchSchema.safeParse({
        ...touch,
        clearNextAction: "on",
        nextAction: "Follow up",
        nextActionOn: "2026-11-11",
      }).success
    ).toBe(false);
  });
});

describe("the list", () => {
  test("reads its filters, ignoring unknown values", () => {
    expect(
      parseCrmFilter({
        country: "iq",
        due: "1",
        kind: "embassy",
        mine: "1",
        owner: ORG,
        q: " example ",
        stage: "talking",
        tag: "STEM",
      })
    ).toEqual({
      country: "IQ",
      due: true,
      kind: "embassy",
      mine: true,
      owner: ORG,
      q: "example",
      stage: "talking",
      tag: "stem",
    });
    expect(
      parseCrmFilter({ country: "XX", kind: "x", owner: "me", stage: "x" })
    ).toEqual({
      country: null,
      due: false,
      kind: null,
      mine: false,
      owner: null,
      q: "",
      stage: null,
      tag: null,
    });
  });

  test("knows when a filter narrows the list", () => {
    expect(isFiltered(parseCrmFilter({}))).toBe(false);
    expect(isFiltered(parseCrmFilter({ mine: "1" }))).toBe(true);
    expect(isFiltered(parseCrmFilter({ q: "uni" }))).toBe(true);
    expect(isFiltered(parseCrmFilter({ stage: "nope" }))).toBe(false);
  });

  test("due first: which rows come from each query", () => {
    expect(splitRange(0, 24, 30)).toEqual({ due: [0, 24], rest: null });
    expect(splitRange(25, 49, 30)).toEqual({ due: [25, 29], rest: [0, 19] });
    expect(splitRange(50, 74, 30)).toEqual({ due: null, rest: [20, 44] });
    expect(splitRange(0, 24, 0)).toEqual({ due: null, rest: [0, 24] });
  });
});
