# The IDEA Club content

Posts for The IDEA Club (`/club`), not schema. `posts/` holds one file per
post, run in order by the **Import The IDEA Post content** workflow
(`.github/workflows/import-content.yml`, run by hand from GitHub Actions;
the workflow keeps its older name).

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
