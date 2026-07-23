# SMElink

SMElink is a mobile-first operations system for small and medium enterprises.
It brings sales, expenses, customers, orders, stock and management reports into
one workspace. The university research chapters supporting the project are in
`docs/`.

## Requirements

- Node.js 22.13 or later
- A Supabase project

## Local setup

1. Install packages with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Add the project URL and publishable key from Supabase.
4. Run the SQL files in `supabase/migrations/` in filename order. If `0001` has
   already been applied, run only the later migrations that have not been run.
   The latest migration adds VAT receipt settings.
5. Start the application with `npm run dev`.

Without environment values, the application opens in a demonstration workspace
so the interface can be reviewed.

## Deploying to Vercel

1. Import this repository into Vercel.
2. Leave the Root Directory empty so Vercel uses the repository root.
3. Leave the Framework Preset as Next.js and keep the default build settings.
4. Connect the Supabase integration from the Vercel project. It adds the public
   project URL and publishable key automatically.
5. In Supabase Authentication URL Configuration, set the Site URL to the Vercel
   production URL and add `https://your-domain/auth/callback` as a redirect URL.
6. In Supabase Authentication Providers, open Email and turn off `Confirm email`.
   SMElink creates the business workspace immediately after account creation.
7. Deploy, then create an account through the application to test the full flow.

For local development, copy `.env.example` to `.env.local` and replace the
example values with the same two values shown in the Supabase project settings.

## Commands

- `npm run dev` starts the local development server.
- `npm run build` creates the production build.
- `npm run lint` checks the source.
- `npm test` runs the build and calculation tests.

## Main folders

- `app/` contains routes and layouts.
- `components/` contains interface and feature components.
- `lib/` contains calculations, formatting and Supabase helpers.
- `supabase/migrations/` contains versioned database changes.
- `docs/` contains the project research chapters.

## Database rules

Every operational record belongs to a business. Row Level Security allows an
authenticated user to access a record only when they are an active member of
that business. Stock changes are stored as inventory movements. Completed sales
deduct stock through a database function so the sale and stock update succeed
or fail together.

Never add a database password or service-role key to this repository.
