# SME Resilience and Operations Support System

A mobile-first web application for Zimbabwean small and medium enterprises to
manage sales, expenses, customers, orders, stock and operational reports.

The application is being developed as a university project based on the
research documents in `docs/`.

## Application

The web application is in `web-app/`. It is a Next.js Progressive Web App with
Supabase authentication and PostgreSQL persistence.

```bash
cd web-app
npm install
npm run dev
```

Copy `web-app/.env.example` to `web-app/.env.local` and add the Supabase project
URL and publishable key. The first database migration is available at
`web-app/supabase/migrations/0001_initial_schema.sql`.

If Supabase is not configured, the application opens with sample records for
interface review.
