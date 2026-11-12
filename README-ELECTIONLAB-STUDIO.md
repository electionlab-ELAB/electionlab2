# ElectionLab Studio — redesigned front end

This build substantially replaces the presentation of the homepage, Republican and Democratic primary dashboards, and presidential polling dashboard. The homepage is an editorial dark hero with an illustrated data motif; the party pages use full-width differentiated color themes, new hero compositions, an above-the-fold polling chart and redesigned candidate standings. The presidential page puts the interactive poll history before the matchup summary cards. Existing image references and Supabase queries are preserved.

## Deployment
1. Back up the existing repository and Supabase database.
2. Replace the contents of your repository with the files in this ZIP (do not delete `.git` when working locally).
3. Commit and push. Hard-refresh after GitHub Pages deploys.
4. Use the included `electionlab-universal-template.xlsx` with the unified importer. If using optional favorability/issue tables, review `OPTIONAL-POLL-CATEGORIES.sql` before applying it.

## Important limitations
- This build has been checked for static markup, JS syntax and preserved data DOM IDs, but not end-to-end tested against your live Supabase instance.
- The existing 2028 presidential polling table supports two-candidate matchups. Multi-candidate general-election ballots require a separately designed schema and UI; do not flatten three-way polls into two-party results.
- The Electoral College forecast is still explicitly marked unpublished. No simulated results or invented forecasts are displayed.
- Portraits remain sourced through existing code/URLs; this package does not generate or replace any portraits.
