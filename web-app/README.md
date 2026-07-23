# SMElink

SMElink is a mobile-first operations system for small and medium enterprises.
It brings sales, expenses, customers, orders, stock and management reports into
one workspace.

## Requirements

- Node.js 22.13 or later
- A Supabase project

## Local setup

1. Install packages with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Add the project URL and publishable key from Supabase.
4. Run `supabase/migrations/0001_initial_schema.sql` in a new Supabase project.
5. Start the application with `npm run dev`.

Without environment values, the application opens in a demonstration workspace
so the interface can be reviewed.

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

## Database rules

Every operational record belongs to a business. Row Level Security allows an
authenticated user to access a record only when they are an active member of
that business. Stock changes are stored as inventory movements. Completed sales
deduct stock through a database function so the sale and stock update succeed
or fail together.

Never add a database password or service-role key to this repository.

