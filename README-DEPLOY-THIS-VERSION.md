# ElectionLab 2.0 — Ready-to-upload editorial UI overhaul

## Installation — easiest method
1. Back up your current GitHub repository and Supabase project first.
2. In `electionlab-ELAB/electionlab2`, open **Add file → Upload files**.
3. **Extract the ZIP** and upload **the files inside** the extracted folder to the root of the repository, beside `index.html`. Overwrite matching filenames. Do not upload the enclosing folder or ZIP.
4. Commit changes to `main`. Vercel should automatically deploy your updated site to `electionlab.info` if the connected Vercel project is configured to deploy `main`.
5. Visit home, both primaries, presidential, generic ballot, approval and `/admin.html`. Hard refresh with Ctrl+Shift+R.

## What's actually changed
- EL. logo consistent across public and admin areas.
- Clean light card UI with navy main navigation; deep blue Democratic header, crimson Republican header, muted purple national polling, slate presidential and approval themes.
- Monochrome editorial candidate portrait photography on the homepage, party primary pages and Trump approval, styled as feathered cutouts. The candidate portrait displayed with live polling automatically changes to the polling leader *when a matching photograph exists*.
- Candidate headshots in primary polling lists are pulled from `primary_candidates.photo_url` (or built-in, licensed portraits for a few specifically named individuals). Admin candidate rows also display provided photos.
- National generic ballot now has a measured poll trend graph; outdated 2026 House/Senate control prediction removed.
- General election now reads **published** `presidential_polls`, supports filters and displays a published-survey trend for a single matchup. The Electoral College panel remains clearly marked **not yet modeled**.
- Detailed polling archive tables are expandable to keep main screens uncluttered.
- Existing admin authentication, Supabase configuration and Excel v3 importer are preserved.

## What is NOT included
- No hypothetical polling percentages, nomination odds or electoral forecast is generated. Nothing changes live data in Supabase.
- No automatic image background-removal service, upload to Supabase Storage or local portrait files. The editorial portraits rely on Wikimedia public URLs and network access. Custom candidate photos remain admin-entered HTTPS URLs.
- No live Supabase login, upload or import test could be performed from here: test with a small draft poll and a sample workbook after deployment.
- The original v3 workbook still supports 2028 primary, generic-ballot and approval sheets, but not the legacy 2026 race/candidate sheets or the new presidential polling table.

Photo credits and licenses: `CREDITS-AND-PORTRAITS.md`.
