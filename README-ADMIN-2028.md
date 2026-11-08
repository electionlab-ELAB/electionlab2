# ElectionLab 2.0 — Admin Studio

This update replaces the visible 2026 administration navigation with a streamlined 2028 workspace. It builds on the **ElectionLab 2.0 party-themes ZIP**, retaining existing site files, authentication and Supabase configuration.

## What is ready

- **Overview:** live counts of Democratic, Republican, presidential, generic-ballot and Trump-approval polls (not demo data).
- **Democratic / Republican Primary:** independent blue/red workspace pages; existing `primary_polls` data and the original edit/save/delete poll dialogs work on each page.
- **2028 candidate roster:** add, edit, disable and delete primary candidates in the new `primary_candidates` table.
- **Presidential Polls:** add, edit, publish and delete national and state matchup polls in the new `presidential_polls` table.
- **National Polling / Trump Approval:** the original Supabase-backed editors remain accessible, with the updated admin styling.
- **Spreadsheet import:** the existing ElectionLab Import v3 workbook and its preview/validation process are preserved. Primary Polls, Generic Ballot and Trump Approval sheets import using the old column structure. The original `.xlsx` file is packaged, and the download link is fixed.
- Old Senate/House/Governor forecasting panels remain in source files for compatibility but are hidden from the admin navigation; data was **not** deleted by this ZIP.

## Install — do this in order

1. **Back up** your GitHub repository and Supabase tables. Do not delete the current site's files before the backup.
2. Open your ElectionLab project in Supabase > **SQL Editor** and run `ADMIN-SETUP-2028.sql` (the entire script). This creates **only** two new tables; it does not clear old polls or candidates.
3. In GitHub, upload the files from this ZIP into the **repository root**, preserving the existing GitHub Pages deployment settings. Make sure `admin-2028.css`, `admin-2028.js`, `admin.html`, `admin-import-v3.js`, the old template file and the original JS/CSS dependencies are all uploaded.
4. Sign in at `/login.html`, then visit `/admin.html`. Check Overview, both primary pages, Presidential Polls and Import Center.
5. Add a **draft** candidate and a **draft** poll first, reload the page and verify they persist. Test an import with a copy of your workbook before uploading the full dataset.

## Old Excel template — what exactly works

Use **`electionlab_import_template_v3(1).xlsx`** unchanged. Its **Primary Polls**, **Generic Ballot** and **Trump Approval** sheets are still supported. The import preview must be reviewed and the import confirmed. **Races**, **Candidates**, **Model Factors**, and **Race Polls** sheets target retired 2026 functionality and are deliberately **ignored** so the old election database is not recreated. The new 2028 candidate roster and presidential matchup polls currently use their dedicated admin editors, not the old 2026 `Candidates` or `Race Polls` workbook sheets.

**Do not treat this as full template compatibility for every 2026 sheet.** The compatible sheets are enumerated above. The import process has **not been tested against your live Supabase database**; inspect the preview and test small uploads first.

## What still needs to be finished

- The redesigned **public** Presidential page does not yet read from the new `presidential_polls` table.
- The public party-primary pages currently derive candidate names and polling averages from `primary_polls`; the new `primary_candidates` roster is an **admin-side database** until the public candidate-profile UI is connected.
- Model settings, live Electoral College calculations, and automated primary trend/nomination graphs are not part of this admin phase.
- It is not live at electionlab.info until you upload the files to your GitHub repository.

## Security

The new tables have row-level security. All readers see only **active** primary candidates and **published** presidential polls; only users registered in `public.admins` can insert, update or delete records. The site uses the existing Supabase publishable key; do not paste a secret service-role key into public JavaScript.

## Troubleshooting

**“Setup needed”** — run `ADMIN-SETUP-2028.sql` in the correct Supabase project, and reload. **“Unavailable”** — check authenticated admin access and the browser console. **Upload rejected** — check the Import Center validation messages; CSV files are supported by the legacy single-sheet importer, but the v3 Import Center expects `.xlsx` / `.xls`. **Page doesn't show new design** — hard-refresh and confirm `admin-2028.css` and `admin-2028.js` are present in the published root.
