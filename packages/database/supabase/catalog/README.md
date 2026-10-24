# Catalog import

Product data, not schema: paste each file into the Supabase SQL editor, in order.
Each file is idempotent — re-running updates names, descriptions, prices and
images, but never resets stock, status or featured flags set in the admin.

1. `catalog-1-store.sql` — tech, cameras, audio, gadgets, games and books for sale
2. `catalog-2-vinyl.sql` — vinyl records
3. `catalog-3-cds.sql` — CDs and cassettes
4. `catalog-4-plus.sql` — Plus rentals (games, books, films)

Items with no stock, a price under 1,000 IQD or an unidentified album import as
drafts. Prices of items not on the inventory sheet are estimates.
