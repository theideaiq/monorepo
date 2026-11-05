# The IDEA Club content

Content for The IDEA Club (`/club`), not schema, run by hand from the **Import
The IDEA Club content** workflow (`.github/workflows/import-content.yml`):
choose `posts`, `opportunities` or `travel`.

## Posts

`posts/` holds one file per post, run in order.

Each file is a single `do` block that upserts the post by its slug and marks
its Telegram news item as already sent, so importing a batch doesn't flood
The IDEA Club's news topic; share the ones you want from the back office.
Running it again updates titles, excerpts, bodies and sections but keeps the
publication date (and any cover image set in the back office).

The first set is the guides from The IDEA's Telegram news channel, rewritten
for the website and brought up to date. Once imported, edit posts in
**Back office → Editorial**; re-running the import overwrites the text of
posts that share a slug with a file here.

Writing rules: Arabic in Modern Standard Arabic with Latin digits, the brand
as "The IDEA …", Markdown with `##` headings (the title is the page's h1),
links to other posts as `/club/<slug>` (the site adds the language), and
facts that change every year (fees, deadlines, exam formats) checked
against the official source and linked.

## Opportunities

`opportunities/` holds batches of outside programs for Club → Opportunities,
one file per batch, each a single `do` block. Every program goes in as a
`draft` under an unclaimed organization, so nothing appears publicly until an
editor approves it in Staff → Club → Opportunities.

Running a file again adds what's missing and updates only the import's own
untouched drafts, matched by slug. It leaves alone anything an editor or
organization has approved, rejected or changed, and it reuses a host that
already exists without members. A draft deleted in Staff comes back on a
re-run, so reject one instead. `scripts/opportunity-content.test.ts` checks
each file's fields and Arabic rules.

Writing rules: at most 300 characters per summary, what it is and who it's
for; Modern Standard Arabic with Latin digits; tanween al-fath on the letter
before the alif (شكرًا); an official Arabic name only if the source gives one;
never free or funded unless the source says so.

## Travel

`travel/` holds batches of Travel Kit routes (one country and visa type
each) with their lines: documents, tasks and open questions, every line
with its source, its confidence and the date it was checked. Every route
goes in as a `draft`, so nothing appears publicly until an editor checks it
and publishes it in Staff → Club → Travel.

Running a file again rewrites only the import's own untouched routes,
matched by slug, with their lines. It leaves alone any route an editor has
published or changed, including one whose lines were edited or added to.
A route deleted in Staff comes back on a re-run, so retire one instead.
`scripts/travel-content.test.ts` checks each file's fields and Arabic rules.

Writing rules: only what a source says, and the source on every line.
Confidence is `official` for the responsible government, its mission in
Iraq or its appointed visa centre; `secondary` for media or commercial
pages; `unconfirmed` for the same country's mission elsewhere. Anything not
sourced is a question to ask, never a requirement. Arabic as above, with
Latin letters only inside « » (form names and codes), in emails and in web
addresses; other companies' names in Arabic letters.
