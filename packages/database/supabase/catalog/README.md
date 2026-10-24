# Catalog import

Product data, not schema. `statements/` holds the first catalog (604
products: store, vinyl, CDs and cassettes, Plus rentals) as idempotent
upserts, one statement per file, run in order by the **Import the catalog
into production** workflow (`.github/workflows/import-catalog.yml`, run by
hand from GitHub Actions). Re-running it updates names, descriptions, prices
and pictures but never resets stock, status or featured flags set in the
back office.

Items with no stock, a price under 1,000 IQD or an unidentified album import
as drafts. Prices of items not on the inventory sheet are estimates.

For new stock, use **Back office → Catalog → Import** (a CSV of the
inventory sheet, previewed before anything is saved).
