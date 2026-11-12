# ElectionLab 3.0 — UI and unified poll intake

## Deployment
Upload the contents of this folder to the root of your existing GitHub Pages repository, keeping filenames and directory structure. Do not upload the enclosing folder itself. Keep your existing Supabase configuration and permissions.

## New features
- Refined responsive public-site styling, party-specific color treatment, retained portrait URLs and assets.
- Presidential chart: 35-day weighted rolling-average lines, interactive individual survey dots, hover/click details and date-range controls. Primary charts retain their existing interactive Chart.js behavior.
- Unified poll importer on Admin > Import Center, alongside the legacy V3 importer.
- Universal Excel template supports presidential national/state head-to-head, primary, generic ballot, approval, favorability, and issue polling. CSV uploads use the selected category.
- Preflight validation, duplicate checks, preview, row-by-row import and progress/error reporting.

## Important limitations
- Existing presidential_polls table is used (not general_election_polls). The current public presidential page reads presidential_polls.
- The importer supports two-party presidential matchups, not three-way results. It does not import multi-candidate general-election matchups.
- Favorability and issue categories require OPTIONAL-POLL-CATEGORIES.sql and appropriate RLS policies before import. These categories are storage-only; public dashboards for them are not included.
- Supabase RLS must allow the signed-in staff account to insert records; the importer does not bypass security.
- No live deployment or end-to-end database verification was performed. Test with a small draft workbook first.
- No forecast prediction model or interactive Electoral College map was introduced; the existing forecast placeholder remains.
