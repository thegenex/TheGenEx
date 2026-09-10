# CLAUDE.md

Guidance for Claude Code (or any agent) working in this repository.

## What this is

theGenEx marketing site + admin CRM/analytics workspace. AI automation & technology agency.

- **Frontend**: React 19 + TypeScript + Vite + wouter, in `frontend/artifacts/thegenex-site` (a pnpm workspace member of `frontend/`).
- **Backend**: Google Apps Script, in `backend/*.gs` — deployed as a Web App, not run as a Node process. There is no traditional server in this repo.
- **Database**: Google Sheets (one spreadsheet, tabs created by `backend/Code.gs`'s `setupBackend_`).
- **Email**: Apps Script `MailApp` — no external SMTP/provider.
- **Deployment**: frontend is containerized (`Dockerfile` at repo root, nginx serving the static build) for Render; backend is pushed with `clasp` and deployed from script.google.com, independent of any container/host.

Full setup/deploy steps live in `README.md`. Don't duplicate them here — this file is about how to work in the repo, not how to deploy it.

## Repo layout

```
TheGenEx/
├── Dockerfile, nginx.conf, .dockerignore   # frontend container (Render)
├── backend/            # Google Apps Script source (.gs), pushed via clasp
│   ├── Router.gs        # doGet/doPost + action dispatch — the API surface
│   ├── Config.gs         # sheet/column layout, limits, Script Properties helpers
│   ├── Auth.gs           # admin email-OTP login + signed session tokens
│   ├── Leads.gs           # contact form validation + submission + status updates
│   ├── Analytics.gs        # visitor/session upsert, page view + event tracking
│   ├── Dashboard.gs         # aggregated read-only data for the admin dashboard
│   ├── Email.gs              # MailApp notification/confirmation emails
│   ├── Utils.gs                # responses, validation, sanitization, sheet I/O
│   ├── Code.gs                  # one-time setupBackend_ (creates sheets, seeds admin)
│   └── .clasp.json              # gitignored — clasp's link to the live script/sheet
└── frontend/
    └── artifacts/thegenex-site/  # the actual site (Vite root)
        └── src/
            ├── lib/api.ts          # the ONLY file that talks to the backend
            ├── lib/analytics.ts     # trackPageView / trackEvent
            ├── lib/visitor.ts        # anonymous visitor_id / session_id
            ├── lib/admin-auth.ts      # admin session token storage
            ├── pages/public-pages.tsx  # Home/Services/Solutions/Products/About/Contact
            └── pages/admin.tsx          # admin login + dashboard
```

`frontend/lib/db`, `frontend/lib/api-spec`, `frontend/lib/api-client-react`, `frontend/artifacts/api-server` are an **unused** Postgres/Express/Drizzle scaffold left over from before the Apps Script decision. Don't build on them; don't assume they're wired to anything.

## Working on the backend (`backend/*.gs`)

- One action-based API: every request carries `action=...` (query param for GET, JSON body for POST). Add new behavior as a new `case` in `Router.gs`'s `dispatchPublic_`/`dispatchAdmin_`, not as a new endpoint — Apps Script Web Apps only have `doGet`/`doPost`.
- **Admin-gated actions must be added to `ADMIN_ACTIONS` in `Router.gs`.** This object is the entire authorization boundary — an action left out of it is publicly callable regardless of what its handler assumes. Check this first when adding anything that reads/writes Leads, Analytics aggregates, or Settings.
- Never trust client input. Validate and clip every field server-side (see `LIMITS` in `Config.gs`) even though the frontend also validates.
- All user-supplied strings that get written to a sheet cell go through `sanitizeCell_()` (`Utils.gs`) to prevent spreadsheet formula injection (leading `=`, `+`, `-`, `@`).
- No secrets in code. Config that varies by deployment (spreadsheet ID, signing secret, notification email) comes from Script Properties (`PropertiesService`) or the `Settings` sheet — see `Config.gs`'s `getConfig_`/`getSettingOrProperty_`. Don't hardcode a real email address or ID as a fallback.
- After editing `.gs` files: `cd backend && npx clasp push -f`, then create+apply a new version to the live deployment (`npx clasp version "<description>"` then `npx clasp redeploy <deploymentId> --description "..."`) — pushing alone does not update the already-deployed Web App URL.
- `npx clasp deployments` lists deployment IDs; keep exactly one production deployment tidy (delete stray ones from `npx clasp deploy` experiments with `npx clasp undeploy <id>`).
- `npx clasp run <fn>` for remote function execution has repeatedly failed silently in this project's history ("Unable to run script function") even after the correct one-time authorization — don't rely on it. If a function needs to run once outside normal request flow (like a setup/migration script), prefer temporarily wiring it as a secret-gated `dispatchPublic_` action (see git history around the original `_bootstrap` action for the pattern), hit it once over HTTPS, then remove it and redeploy.

## Working on the frontend (`frontend/artifacts/thegenex-site`)

- `src/lib/api.ts` is the single point of contact with the backend. Add new backend calls there, typed, rather than calling `fetch` elsewhere.
- `VITE_API_URL` unset → the app runs in mock mode automatically (`IS_MOCK_MODE` in `api.ts`). Don't special-case this elsewhere; `api.ts` already returns sane mock responses so the rest of the app doesn't need to know.
- Analytics: call `trackEvent(name, metadata, page?)` for interactions and rely on the router's automatic `trackPageView` on navigation (`App.tsx`'s `usePageViewTracking`) — don't call `trackPageView` manually from a page component.
- Preserve the existing visual language (dark, premium, mono/display type pairing, `SiteShell`/`SectionLabel`/`ButtonLink` primitives in `site-shell.tsx`). Don't introduce a new design system for a new page/section — extend the existing primitives.
- Commands (run from `frontend/`, or from `frontend/artifacts/thegenex-site` where noted):
  ```bash
  pnpm install                                            # from frontend/
  cd artifacts/thegenex-site
  PORT=5000 BASE_PATH=/ pnpm run dev                       # dev server
  pnpm run typecheck
  PORT=5000 BASE_PATH=/ NODE_ENV=production pnpm run build  # prod build → dist/public
  ```
  `PORT`/`BASE_PATH` are required env vars — `vite.config.ts` throws without them.

## Docker / Render

- `Dockerfile` (repo root) is a two-stage build: `pnpm`/Vite build → static files served by nginx. `VITE_API_URL` must be passed as a **build arg** (it's baked into the JS bundle at build time, not read at container runtime):
  ```bash
  docker build --build-arg VITE_API_URL=https://script.google.com/macros/s/XXX/exec -t thegenex-frontend .
  docker run -p 8080:8080 thegenex-frontend
  ```
- No `render.yaml` by design (per project decision) — configure the Render service (Docker runtime, build arg, port) through the Render dashboard.
- The container has no knowledge of the backend beyond the URL baked into it — redeploying the container is never required for a backend-only change, and vice versa.

## Things not to do

- Don't add a Node/Express backend "just to be safe" — the architecture decision is Apps Script + Sheets, made deliberately (see README's Architecture section for why).
- Don't touch `frontend/lib/db`, `lib/api-spec`, `lib/api-client-react`, `artifacts/api-server` — dead scaffold, not part of the shipped system.
- Don't put a real API URL, spreadsheet ID, or `APP_SECRET` value into a committed file. `.env`, `backend/.clasp.json`, and anything matching `.env.*` are gitignored for this reason — keep it that way.
- Don't reintroduce a hardcoded fallback email address in `Config.gs`/`Auth.gs` — notification/admin email must come from Script Properties or the Settings sheet.
