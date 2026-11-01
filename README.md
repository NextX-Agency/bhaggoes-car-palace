# Bhaggoes Car Palace

Responsive dealership website and staff dashboard built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase. The live catalog currently contains two test vehicle records with generated photos and unverified USD prices. They must be replaced or verified before the site is used to offer actual cars for sale.

## Local setup

1. Install the dependencies: `npm install`.
2. Copy `.env.example` to `.env.local` and add the dedicated Supabase project URL and publishable key.
3. Apply the database migration with `npx supabase link --project-ref <project-ref>` followed by `npx supabase db push`.
4. Start the site with `npm run dev`.

The production site also uses `NEXT_PUBLIC_SITE_URL` for canonical, sitemap, and inquiry links. On Vercel, set it to the deployment's canonical URL after the domain is known.

## First administrator

Set the Supabase Auth Site URL to the deployed `/admin/setup` page. In Supabase Authentication → Users, send an invitation to the dealership owner's email. Then open the Supabase SQL editor and grant that account the administrator role:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where lower(email) = lower('owner@example.com')
);
```

Replace the example email with the invited account's email. The auth trigger creates a `staff` profile automatically. The invited user follows the email link and sets a password at `/admin/setup`, then signs in at `/admin/login`. Only an organization owner using the SQL editor should promote the first administrator; users cannot promote themselves from the website. Never put a service-role key in browser-visible environment variables.

## Users

After the first administrator exists, everyone else is managed from **Gebruikers** (`/admin/users`) in the dashboard; no Supabase access or email delivery is needed:

- **Gebruiker toevoegen** creates an account with a generated temporary password. Copy the ready-made message and send it to the colleague; on first login they must choose their own password at **Mijn account** (`/admin/account`) before the rest of the dashboard opens.
- **Toegang** switches an account between *Beheerder* (full access) and *Geen toegang* (blocked without deleting it).
- **Nieuw wachtwoord** sets a new temporary password for someone who forgot theirs and signs them out everywhere.
- **Verwijderen** deletes the account. Administrators cannot block or delete themselves, so there is always at least one administrator.

These actions run through the admin-only database functions in `supabase/migrations/20261101150000_dashboard_user_management.sql`; each one checks that the caller is an administrator.

## Admin dashboard

- Sign in at `/admin/login`.
- **Overzicht** has the catalog switch (hide every car and show the dealership landing instead), the photo optimizer and what still needs attention.
- **Snel uploaden** (`/admin/inventory/bulk`) adds many cars at once; only photos are required. Make, model, title and price are optional everywhere.
- Create and edit inventory at `/admin/inventory`. Use **Show on website** to make a listing public, **Archive** to hide it without deleting it, **Restore** to return an archived listing as a hidden draft, or **Delete permanently** in the editor to remove it.
- Add up to 15 vehicle photos to private Supabase Storage. Images are served only when the listing policy allows access; photo reordering is checked in a database function.
- Customer questions currently go to the dealership's WhatsApp account. WhatsApp chats are not synced to the dashboard; the separate website inquiry inbox and its submission endpoint are disabled until that feature is enabled.
- Edit contact details, homepage copy, financing visibility, the logo, and policy/FAQ content from the dashboard.

The dashboard and public catalog rely on the database. The two test listings retain `DEMO-` stock numbers internally; archive them when verified real inventory is ready. Their public pages are excluded from search indexing and the sitemap. Financing estimates are not offers, and financing is hidden from the homepage and vehicle pages until enabled in settings. A price without a currency uses the currency from the settings.

## Database and access model

Apply every file in `supabase/migrations/` in order (Supabase SQL editor or `supabase db push`). The base migration `20261015182531_dealership_platform.sql` creates inventory, private vehicle fields, media metadata, settings, FAQs, policy pages, profiles, and inquiries. Row Level Security is enabled on every application table. Anonymous visitors can read published public content; the inquiry function is currently disabled for public roles. Only administrator profiles can manage dealership content. VINs and staff notes live in a separate restricted table.

## Commands

- `npm run dev` — local development server
- `npm run build` — production build
- `npm run start` — production server
- `npm run typecheck` — TypeScript validation
- `npm run lint` — ESLint
- `npm test` — unit tests
- `npm run test:e2e` — browser checks

## Production checklist

- All migrations in `supabase/migrations/` applied, including the catalog switch, banner photos and user management.
- Supabase Authentication → *Leaked password protection* switched on.
- Vercel environment variables set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` (the public domain; without it the Vercel production URL is used).
- After the first deploy: run **Foto’s verkleinen** on Overzicht once, so older full-size photos are shrunk.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` and `npm run test:e2e` pass (the GitHub workflow runs them on every push).

## Deployment

Deploy the repository to the authorized Vercel team and configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` in the Vercel project. Apply the migration to the dedicated Supabase project before enabling inquiries or admin access. Do not reuse credentials or databases from unrelated projects.
