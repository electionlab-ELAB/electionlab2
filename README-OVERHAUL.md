# ElectionLab 2.0 — deployment notes

## Included
- Redesigned 2028-focused home page
- Separate Democratic and Republican primary pages using existing `primary_polls` data and `primary.js` polling calculations
- New 2028 presidential landing page (no fabricated electoral projections)
- Updated navigation across public pages
- Removed House, Senate, Governors HTML pages
- Legacy `primary.html` redirects to Democrats
- Admin and Supabase configuration preserved

## Publish
1. Back up the existing GitHub repository and Supabase database.
2. Test the files on a preview deployment (GitHub Pages branch or local web server).
3. Confirm primary polling, approval, generic ballot, admin login and mobile navigation.
4. Merge into the publishing branch only after testing.

## Important limitations
- Existing primary polling data and averages are reused; no new state primary model was added.
- Presidential general election forecasting is not yet implemented; the page explicitly states this.
- Old 2026 forecast logic remains in `public.js`, `maps.js`, and admin code for compatibility, even though public House/Senate/Governors pages are removed.
- Verify admin links to deleted pages and adjust any external bookmarks.
- Supabase policies and live connectivity were not tested in this offline build.

## Party-specific theme update
- Republican primary now has a deep crimson header and hero, soft red page backdrop, and red-accented cards, tabs, tables and chart controls.
- Democratic primary has a rich blue header and hero, soft blue backdrop, and blue-accented interface elements.
- Primary pages have working cross-links to switch between parties without mixing polling data.
- The changes are limited to `democrats.html`, `republicans.html`, and CSS at the bottom of `styles.css`. Polling logic, Supabase settings and all other pages are untouched.

## Admin Studio update (2028)

See `README-ADMIN-2028.md` for the new admin dashboard, party rosters, presidential polling management, spreadsheet compatibility details and the **one-time `ADMIN-SETUP-2028.sql` database migration**.
