# Bhaggoes Car Palace

Responsive dealership website and staff dashboard built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase. The public site starts with an empty inventory so it never displays invented cars or customer claims.

## Local setup

1. Install the dependencies: `npm install`.
2. Copy `.env.example` to `.env.local` and add the dedicated Supabase project URL and publishable key.
3. Apply the database migration with `npx supabase link --project-ref <project-ref>` followed by `npx supabase db push`.
4. Start the site with `npm run dev`.

The production site also uses `NEXT_PUBLIC_SITE_URL` for canonical, sitemap, and inquiry links. On Vercel, set it to the deployment's canonical URL after the domain is known.

## First administrator

Create the first staff account from Supabase Authentication using the dealership owner's email. Then open the Supabase SQL editor and grant that account the administrator role:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where lower(email) = lower('owner@example.com')
);
```

Replace the example email with the invited account's email. The auth trigger creates a `staff` profile automatically. Only an organization owner using the SQL editor should promote the first administrator; users cannot promote themselves from the website. Never put a service-role key in browser-visible environment variables.

## Admin dashboard

- Sign in at `/admin/login`.
- Create, edit, duplicate, publish, and remove inventory at `/admin/inventory`.
- Add up to 15 vehicle photos to private Supabase Storage. Images are served only when the listing policy allows access; photo reordering is checked in a database function.
- Review customer inquiries and change their status at `/admin/inquiries`.
- Edit contact details, homepage copy, financing visibility, the logo, and policy/FAQ content from the dashboard.

The dashboard and public catalog rely on the database. No demonstration inventory is seeded. Financing estimates are not offers, and financing is hidden from the homepage and vehicle pages until enabled in settings.

## Database and access model

The migration at `supabase/migrations/20261015160738_dealership_platform.sql` creates inventory, private vehicle fields, media metadata, settings, FAQs, policy pages, profiles, and inquiries. Row Level Security is enabled on every application table. Anonymous visitors can read published public content and submit inquiries through a validated, rate-limited database function. Only administrator profiles can manage dealership content. VINs and staff notes live in a separate restricted table.

## Commands

- `npm run dev` — local development server
- `npm run build` — production build
- `npm run start` — production server
- `npm run typecheck` — TypeScript validation
- `npm run lint` — ESLint
- `npm test` — unit tests
- `npm run test:e2e` — browser checks

## Deployment

Deploy the repository to the authorized Vercel team and configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` in the Vercel project. Apply the migration to the dedicated Supabase project before enabling inquiries or admin access. Do not reuse credentials or databases from unrelated projects.
