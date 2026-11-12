# ElectionLab 2028 — party-color / portrait overhaul (November 8, 2026)

This is a **full copy of the previous ElectionLab 2.0 overhaul**, not just CSS patches. Your 2028 primary, presidential, generic-ballot, approval, admin, and spreadsheet import handlers are preserved. The fixed Import v3 JavaScript replaces the earlier importer.

## Install
1. **Back up** your GitHub repository and Supabase database. Extract the ZIP, then upload **all extracted files** (not the ZIP itself) into the root of your website repository, replacing matching names. This is the same repo where `index.html` and `config.js` live.
2. In Supabase SQL Editor, run `STORAGE-SETUP-CANDIDATE-PHOTOS.sql` **once** to add the public `candidate-photos` bucket and admin-only upload policy. This does **not** alter polling records. If `primary_candidates` does not already exist, first run the included `ADMIN-SETUP-2028.sql`.
3. Deploy, then visit `/admin.html`. Open the Democratic/Republican Primary workspace. You can select **Choose photo**, upload an image (JPG/PNG/WebP up to 4 MB), or paste an HTTPS image URL. Save to publish the selected image. Poll names missing from the roster appear as **Add & choose photo** rows so you can select a picture for every name in the polling list.
4. Hard-refresh `index.html`, `democrats.html`, and `republicans.html` (Ctrl+Shift+R).

## Changes requested
- Both party logos are included as local assets: `party-democrat.png` and `party-republican.png`, taken from the images you provided. They replace candidate portraits on homepage party cards and replace the portrait / 2028 decoration on primary heroes.
- Democrats are saturated blue and Republicans saturated red, including large section backgrounds, charts, borders and nav. White leader cards have **dark**, readable lettering.
- Leader panels show the **margin over the runner-up**; e.g. 37.4% vs. 26.5% → JD Vance **+10.9%**. The list and colored bar continue to show each candidate's actual average share. A lead is a **percentage-point margin**, not a candidate's share.
- The homepage hero now uses an **actual public-domain photo** of the U.S. Capitol (Architect of the Capitol, 1997, hosted on Wikimedia Commons) rather than the overlapping Capitol vector and giant numeral. Background photo is fetched from Wikimedia while site runs. Photo source: https://commons.wikimedia.org/wiki/File:United_States_Capitol_-_west_front.jpg
- Candidate photos come only from your `primary_candidates.photo_url` records; **until you select an image for a person, initials appear**. No default headshots are imposed or overridden.
- Candidate images are **not uploaded to GitHub**; they live in Supabase Storage and their HTTPS URLs are saved in `primary_candidates.photo_url`.

## Deployment reality
No Supabase credentials beyond the original public client config were added. I could not log in to your live Supabase project to run SQL or test actual uploads. If a photo upload returns an error about the bucket or storage policy, run the SQL and check the authenticated user's entry in your ElectionLab `admins` table. The SQL uses the **existing** `public.is_admin()` predicate.

## Preservation
Existing data has not been migrated or deleted. `config.js`, the user accounts, admin authentication, forecasting, primary calculations (except leader display), other public dashboards, and polling spreadsheets remain intact.
