# Catalog import

The first catalog (604 products: store, vinyl, CDs and cassettes, Plus
rentals) was loaded into production on 2026-10-24 by a one-off "Import the
catalog into production" workflow, from upsert statements in this folder.
On 2026-10-25 migration `20261216000000_catalogue_reshape.sql` folded it
into 542 titles with variants (formats, platforms, colours), copies by
condition, and one product per title sold and rented. The statements and
the workflow were removed then: running them again would have recreated
the old one-product-per-version catalog. Both are in the Git history.

For new stock, use **Back office → Catalog → Import** (a CSV of the
inventory sheet with `variant_en`, `variant_ar` and `format` columns,
previewed before anything is saved). To copy the catalog into another
database, restore a backup (`docs/platform`).
