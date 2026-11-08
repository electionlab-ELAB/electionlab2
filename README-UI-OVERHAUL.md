# ElectionLab 2.0 — Public UI overhaul

## Deployment
Upload **all files from this ZIP** into the root of your `electionlab2` GitHub repository, replacing files with the same names. Vercel should deploy automatically. Do not upload the ZIP itself. Do not delete your Supabase tables.

## Changes
- Consistent text-based EL. logo in the public navigation and admin navigation markup.
- Refined white editorial cards, navy headers, red Republican and blue Democratic gradients, simplified hierarchy.
- Candidate grayscale portraits automatically sourced from the `photo_url` in `primary_candidates` (admin portal candidate editor). When no licensed photo URL exists, initials are shown. No fabricated candidate photographs or polling numbers.
- New 2028 Presidential page reads **published** rows from `presidential_polls`, with national/state and matchup filters. Latest survey is explicitly labeled as a single poll, not an average or forecast.
- Existing primary, generic-ballot and approval chart IDs/scripts are preserved.
- Existing admin importer, SQL, authentication and Supabase config remain unchanged.

## Candidate portraits
In the admin portal open the Democratic or Republican candidate editor and enter a publicly accessible HTTPS photo URL in the photo field. Use a photo you have rights to display. Grayscale treatment is applied automatically. The headshot is optional; no photos are bundled.

## Important
Supabase integration cannot be live-tested without an authenticated session. Check pages after deployment. Never place Supabase service-role keys in frontend files.
