# ElectionLab — Owner / Worker User Management

This package is a patch to the ElectionLab 2028 site from the **November 8, 2026** `ElectionLab-2028-Nitpick-Overhaul.zip`. It preserves the 2028 polling pages and existing data. **It has not been installed on the live site or tested against the live Supabase database.** If your GitHub files have changed since that ZIP, merge changes instead of blindly overwriting newer versions.

## What this adds

- Same `login.html` for **Owner** and **Worker**.
- Owner-only **User Management** menu in `admin.html`.
- Owner can invite worker by email, edit permissions, disable/enable, or delete workers. The owner account cannot be demoted or deleted through this system.
- Worker defaults to all permissions on. No worker can manage accounts.
- Supabase RLS checks permissions from the database at request time for known admin-edited tables.
- Disabled workers are blocked from privileged database writes even when an earlier login token remains in the browser, and new sign-ins are blocked via the Auth ban.
- Audit trail of **staff/account changes** (not an audit trail of every poll edit).

## Installation order

**1. Backup first.** Back up the GitHub repository and the Supabase database. Do not re-run older `supabase-schema.sql` to set up this feature; use only the new migration.

**2. Run `ELECTIONLAB-OWNER-WORKER-SETUP.sql` once** in Supabase Dashboard → SQL Editor. It adds columns to the existing `public.admins` table. It automatically promotes the existing account to Owner **only if exactly one row exists in `public.admins`**.

If there are multiple admin rows, assign the owner from the SQL Editor using **your real Supabase Auth user UUID**:

```sql
select a.user_id, u.email, a.role from public.admins a
join auth.users u on u.id = a.user_id;

-- After verifying which UUID is yours:
update public.admins set role='owner', is_active=true
where user_id='PASTE-YOUR-REAL-UUID-HERE';
```

If you have no row in `public.admins`, first register your login as instructed in your original ElectionLab setup, then promote it. Keep exactly one owner.

**3. Deploy the changed GitHub Pages files.** Upload these files from the patch to the **same repository root** as `index.html`:

```
admin.html
admin.js
admin-2028.js
admin-2028.css
admin-import-v3.js
login.html
login.js
owner-workers.js                (new)
accept-invite.html              (new)
accept-invite.js                (new)
```

If your version of those originals is newer than November 8, merge the changes rather than replacing them wholesale. Do **not** upload `SUPABASE_SERVICE_ROLE_KEY` or any other secret to GitHub.

**4. Allow the worker invitation redirect.** In Supabase Dashboard → Authentication → URL Configuration, add `https://electionlab.info/accept-invite.html` to **Redirect URLs** (and your other domain if you use one). The Edge Function uses this URL by default.

**5. Deploy the server function** `supabase/functions/manage-staff/index.ts`. You can use Supabase CLI from the project root:

```bash
supabase login
supabase link --project-ref YOUR_SUPABASE_PROJECT_REF
supabase functions deploy manage-staff
```

Deploy with **JWT verification enabled** (the default). This function authenticates each request, independently confirms the caller is an active Owner in the database, and *only then* invokes the privileged Supabase Auth admin API. Supabase automatically exposes the legacy `SUPABASE_SERVICE_ROLE_KEY` to deployed Edge Functions; it is **never** used by the web page. You can also set `ELECTIONLAB_SITE_URL` as an Edge Function secret if the site domain differs (do not name custom secrets with a `SUPABASE_` prefix).

**6. Hard-refresh** ElectionLab `login.html` and `admin.html`. You should see **User Management** as Owner, then invite a **test Worker** and verify the emailed `accept-invite.html` flow.

## Permissions

| Owner switch | Database enforcement | UI |
|---|---|---|
| Poll editing | RLS restrictive write policies on race, primary, generic, approval, presidential polls | Existing editors may still show buttons but writes will be blocked |
| Candidate / race editing | RLS restrictive write policies on races, candidates, primary candidates; candidate photo uploads | Existing editors may still show buttons but writes will be blocked |
| Forecast editing | RLS restrictive write policies on forecast changes and several model input tables | Existing editors may still show buttons but writes will be blocked |
| Website settings | RLS restrictive write policies on site_settings | Existing editors may still show buttons but writes will be blocked |
| Spreadsheet imports | Hide/disable the importer in the UI | **Not a distinct database permission.** A worker who can edit the underlying tables can still bulk-insert data using the Supabase API. Fully isolating this capability requires moving imports behind a dedicated server endpoint. |

**Important limitations:** Some existing ElectionLab model recalculation RPCs may run as PostgreSQL `SECURITY DEFINER`; if such functions allow `authenticated` users to call them, their side effects may bypass table-level RLS. **Do not regard per-feature revocation as security-complete until these RPCs and any tables not using RLS have been audited and tested.** Entire-account disabling protects the ordinary browser admin and RLS-protected table requests; it does not retroactively revoke a previously issued JWT. Do not give worker accounts service-role keys or Supabase Dashboard project access.

## Verification checklist

- Owner signs in through existing `login.html` and can still edit polls.
- Owner sees User Management; worker never sees it.
- Worker receives invite, sets a password, and can log into existing login page.
- Turn off **Poll editing** for worker: worker cannot save a poll (check protected tables), but you can.
- Disable worker: next RLS-protected write fails; after login refresh, they cannot enter the Admin workspace; new Auth sign-in should be banned.
- Re-enable worker: account is permitted again.
- Confirm the Owner account cannot be disabled or deleted from User Management.
- Test every RPC that updates data (especially recalculation) under a disabled Worker account before production use.

## Troubleshooting

- **`manage-staff` 401:** Worker/owner needs a fresh login; Edge Function JWT verification must remain enabled.
- **403 Owner access required:** Verify your `admins.role='owner'` and `admins.is_active=true`.
- **Invitation sends but link fails:** Check Authentication → URL Configuration and invite email expiry; resend if it expired.
- **`admins` column not found:** Run the new SQL migration once; do not run older setup SQL in its place.
- **Worker can still call a model recalculation RPC:** Check that function's PostgreSQL execution grants and whether it uses `SECURITY DEFINER`; it requires a separate server-side permission gate.
