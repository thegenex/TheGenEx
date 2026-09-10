# theGenEx — AI Automation & Technology Agency

Premium responsive marketing site and protected-looking admin preview for an AI automation and technology agency.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/thegenex-site/src/App.tsx` — route map and app providers
- `artifacts/thegenex-site/src/pages/public-pages.tsx` — public marketing, contact, and legal pages
- `artifacts/thegenex-site/src/pages/admin.tsx` — mock admin dashboard preview
- `artifacts/thegenex-site/src/components/` — shared site shell and abstract network visual
- `artifacts/thegenex-site/src/data/site.ts` — services, solutions, products, and mock dashboard data
- `artifacts/thegenex-site/src/lib/analytics.ts` — replaceable local analytics abstraction
- `artifacts/thegenex-site/src/index.css` — site theme, typography, grid/noise background, and motion tokens

## Architecture decisions

- The first release is frontend-only; contact submission and analytics are intentionally isolated behind small local abstractions for the future Google Apps Script integration.
- Marketing content lives in typed data modules where it is likely to be replaced as products and proof points become public.
- The visual language uses an abstract system/network visual rather than stock photography or literal AI imagery.
- Admin is clearly presented as a preview with representative mock data until authentication and Google Sheets persistence are added.

## Product

theGenEx communicates AI automation, custom software, digital products, industry solutions, and a clear contact path. It includes responsive public routes for Home, Services, Solutions, Products, About, Contact, Privacy, and Terms, plus an interactive mock admin view with overview metrics, activity, contacts, leads, and page summaries.

## User preferences

The user wants a premium, futuristic, minimal, professional technology-company experience without invented claims or generic corporate copy.

## Gotchas

The contact form is a frontend mock and does not send email yet. Replace the isolated API function when the Google Apps Script endpoint exists; do not hardcode that URL before then.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
