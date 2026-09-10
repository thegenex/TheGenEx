# theGenEx — AI Automation & Technology Agency

Marketing site + admin CRM/analytics workspace for theGenEx, an AI automation and technology agency.

```
TheGenEx/
├── frontend/          React + TypeScript site (Vite, pnpm workspace) — see frontend/artifacts/thegenex-site
├── backend/           Google Apps Script API (Leads / Analytics / Auth / Email over Google Sheets)
├── Dockerfile          Single-container build for the frontend (nginx), used for Render deploys
├── nginx.conf
├── CLAUDE.md            Notes for AI coding agents working in this repo
├── LICENSE               MIT
└── README.md
```

---

## 1. Architecture

```
                    ┌─────────────────────┐
                    │   theGenEx Website   │
                    │  React + TypeScript  │
                    │  (Docker + nginx)     │
                    └──────────┬──────────┘
                               │ HTTPS
                               ↓
                    ┌─────────────────────┐
                    │ Google Apps Script  │
                    │       API           │
                    └──────┬───────┬──────┘
                           │       │
                 ┌─────────┘       └──────────┐
                 ↓                            ↓
        ┌─────────────────┐          ┌─────────────────┐
        │  Google Sheets  │          │ Gmail / MailApp │
        │    Database     │          │ Email Alerts    │
        └─────────────────┘          └─────────────────┘
```

- **Frontend**: `frontend/artifacts/thegenex-site` — React 19 + TypeScript + Vite + wouter routing + Tailwind. Unchanged in visual design; a small API/analytics/auth layer was added under `src/lib/`. Deployed as a single Docker container (static build served by nginx) — see section 7.
- **Backend**: `backend/*.gs` — a single Google Apps Script project deployed as a Web App. No servers, containers, or hosting bills for the API itself; it runs entirely on Google's infrastructure.
- **Database**: One Google Sheet with tabs `Leads`, `Visitors`, `PageViews`, `Events`, `Admins`, `Settings` (plus two internal tabs, `Sessions` and `Otp`, used for admin auth).
- **Email**: `MailApp` (no external SMTP, no extra credentials).

## 2. Frontend setup (local development)

```bash
cd frontend
pnpm install
cd artifacts/thegenex-site
PORT=5000 BASE_PATH=/ pnpm run dev
```

(`PORT` and `BASE_PATH` are required env vars read by `vite.config.ts`.)

### Frontend environment

Copy `frontend/artifacts/thegenex-site/.env.example` to `.env` and set:

```env
VITE_API_URL=YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL
```

**If `VITE_API_URL` is not set, the site runs in mock mode**: the contact form, analytics, and admin dashboard all work against local mock data (clearly labeled "Development mode" / "Mock data" in the UI) so the frontend is fully usable without a deployed backend. Production builds/images must set this variable to the real deployment URL.

All backend calls go through the single client at `src/lib/api.ts` — nothing else in the app talks to the network directly.

## 3. Google Sheet setup

The backend creates its own spreadsheet — you don't need to create one by hand. Using `clasp` (Apps Script's CLI):

```bash
cd backend
npx clasp login          # opens a browser; sign in as the Google account that should own the Sheet + send emails
npx clasp create --type sheets --title "theGenEx Backend"
```

This creates a new Google Sheet and an Apps Script project bound to it, and writes `backend/.clasp.json` (gitignored — see `backend/.clasp.json.example` for its shape). `clasp create` overwrites `appsscript.json` with defaults; restore the one from git (`git checkout backend/appsscript.json`) before pushing, since it needs `webapp.access: ANYONE_ANONYMOUS`.

Leave the Sheet's tabs empty — the backend creates all required tabs and headers the first time `setupBackend_` runs (step 4 below):
- `Leads`, `Visitors`, `PageViews`, `Events`, `Admins`, `Settings` (per the spec)
- `Sessions`, `Otp` (internal, used only for admin login — not part of the CRM data model)

## 4. Apps Script setup

1. Push the code: `cd backend && npx clasp push -f`
2. Open the script: `npx clasp open-script` (or use the URL printed by `clasp create`). Go to **Project Settings** (gear icon) → **Script Properties** → add:

   | Property | Value |
   |---|---|
   | `SPREADSHEET_ID` | the Sheet's ID (from its URL, or `parentId` in `backend/.clasp.json`) |
   | `APP_SECRET` | a long random string (`openssl rand -hex 32`) — signs admin session tokens and hashes OTP codes |
   | `NOTIFICATION_EMAIL` | the inbox that should receive lead notifications and admin OTP codes |
   | `SEED_ADMIN_EMAIL` | the first admin's email (usually the same as `NOTIFICATION_EMAIL`) |

3. Run the one-time setup. `clasp run` has been unreliable for this in practice (fails with "Unable to run script function" even after granting permissions) — the dependable path is deploying and calling `setupBackend_` over HTTPS once:
   - In the editor: **Deploy → New deployment** → gear icon → **Web app** → Execute as **Me**, Who has access **Anyone** → **Deploy**. Approve the authorization prompt (Advanced → Go to theGenEx Backend (unsafe) → Allow — this is your own script acting on your own Sheet/mailbox).
   - Copy the **Web app URL** (`.../exec`) — this is your `VITE_API_URL`.
   - Temporarily add a secret-gated bootstrap action to `Router.gs`'s `dispatchPublic_` (guarded by comparing a query param against `getAppSecret_()`, so only someone holding `APP_SECRET` can call it) that calls `setupBackend_()`, push, redeploy, hit it once in the browser, then remove it and redeploy again. This creates all sheet tabs, seeds `Settings` defaults, and adds the seed admin to `Admins`.
4. Paste the Web app URL into `frontend/artifacts/thegenex-site/.env` as shown in section 2.

To ship a backend code change later:
```bash
cd backend
npx clasp push -f
npx clasp version "describe the change"
npx clasp deployments                 # find your production deployment's ID
npx clasp redeploy <deploymentId> --description "..."
```
The web app URL stays the same across redeploys — no frontend change needed for a backend-only update.

## 5. Email setup

- Notifications use `MailApp.sendEmail()`, which sends from the Google account that owns the Apps Script project (the account you used in step 3/4). No SMTP credentials are needed.
- The first time the script actually sends mail, Google may prompt for authorization again — approve it.
- `MailApp` has Google's standard daily sending quota for consumer Gmail accounts (100/day at time of writing) — sufficient for lead-notification volume. If you outgrow it, swap to `GmailApp` (same setup) or move to a transactional email provider later without changing the frontend.
- Client confirmation emails can be turned off without a redeploy by setting the `Settings` sheet row `send_confirmation_email` to `false`.
- If `notification_email` (Settings sheet) / `NOTIFICATION_EMAIL` (Script Property) is unset, lead notification email is skipped — the lead is still saved to the sheet, and the skip is logged server-side (Apps Script execution log).

## 6. Admin setup

- The `Admins` sheet is the allowlist. The address in `SEED_ADMIN_EMAIL` is seeded automatically by `setupBackend_`.
- **To add another admin**: add a row to the `Admins` sheet with that person's email, `role` = `admin`, `active` = `TRUE`. No redeploy needed.
- **Login flow** (no passwords, ever, anywhere in source): on `/admin`, an admin enters their email → the backend emails a 6-digit one-time code (valid 10 minutes) only if that email is on the allowlist → the admin enters the code → the backend issues a short-lived (12h), HMAC-signed session token. The token is verified server-side on every admin API call; nothing about admin identity or authorization lives in frontend code.

## 7. Deploying the frontend (Docker / Render)

The frontend ships as a single Docker image — a multi-stage build that compiles the Vite site and serves the static output with nginx. `VITE_API_URL` is a **build-time** value (Vite bakes it into the JS bundle), so it must be passed as a build arg, not a runtime environment variable.

```bash
docker build --build-arg VITE_API_URL=https://script.google.com/macros/s/XXXX/exec -t thegenex-frontend .
docker run -p 8080:8080 thegenex-frontend
```

**On Render**: create a new **Web Service**, connect this repo, set:
- Runtime: **Docker**
- Root directory: repo root (where `Dockerfile` lives)
- Build arg: `VITE_API_URL` = the Apps Script Web App URL
- Render provides `$PORT` at runtime; the image's nginx config (`nginx.conf`) is templated with `envsubst` at container start to listen on it (via the official nginx image's `/etc/nginx/templates/` mechanism) — no manual port configuration needed.

There is intentionally no `render.yaml` in this repo — configure the service through the Render dashboard.

## 8. Running the project (all commands)

```bash
# Frontend — local dev
cd frontend
pnpm install
cd artifacts/thegenex-site
cp .env.example .env   # then set VITE_API_URL
PORT=5000 BASE_PATH=/ pnpm run dev

# Frontend — typecheck / production build
pnpm run typecheck
PORT=5000 BASE_PATH=/ NODE_ENV=production pnpm run build

# Frontend — production container
docker build --build-arg VITE_API_URL=<your Apps Script URL> -t thegenex-frontend .
docker run -p 8080:8080 thegenex-frontend

# Backend — push/deploy (from backend/)
npx clasp push -f
npx clasp version "..."
npx clasp redeploy <deploymentId> --description "..."
```

## 9. Credentials & configuration you need to provide

None of these are invented or hardcoded anywhere in this codebase. You'll need to obtain/create them yourself:

| Credential | Where to get it | Where it goes | Why |
|---|---|---|---|
| `SPREADSHEET_ID` | Created by `clasp create --type sheets` (section 3), or copy from the Sheet's URL | Apps Script → Script Properties | Backend reads/writes this exact sheet |
| `APP_SECRET` | Generate yourself (`openssl rand -hex 32`) | Apps Script → Script Properties | Signs admin session tokens & OTP hashes — never put this in frontend code or git |
| Apps Script Web App URL | Apps Script editor → Deploy → New deployment | `frontend/artifacts/thegenex-site/.env` (dev) and the Docker build arg (production) as `VITE_API_URL` | The one URL the frontend calls |
| Google account owning the Apps Script project | Your own / theGenEx's Google account | Used implicitly when you deploy ("Execute as: Me") | Determines which mailbox sends notification emails via MailApp |

Nothing else (no OAuth client IDs, no API keys, no database passwords) is required — that's the point of the Apps Script + Sheets architecture.

## 10. Known Apps Script limitations

- **Cold start latency**: the first request to a Web App after idle can take 1–3 seconds. Subsequent requests are fast.
- **No custom CORS headers on preflighted requests**: the API client avoids the problem by using GET for reads and a `text/plain` POST body (no preflight) for writes, per Apps Script's supported pattern.
- **No true concurrency control beyond `LockService`**: used around writes (lead submission, status updates, OTP issuance) to avoid race conditions; heavy concurrent traffic isn't this architecture's strength, but it comfortably handles a marketing site's contact/analytics volume.
- **Gmail/MailApp daily send quota**: fine for lead-volume notification email; not meant for bulk/marketing email.
- **No raw visitor IP**: Apps Script Web Apps do not expose the caller's IP to server code, so `ip_hash` stays blank unless a client explicitly provides one (not required, not trusted for security decisions).
- **`clasp run` is unreliable**: remote function execution via `clasp run` has repeatedly failed in this project even after completing the one-time authorization flow. Prefer deploying and hitting a (temporary, secret-gated) HTTP action for anything that needs to run once outside normal request handling.
- **Sheets as a database**: great for this scale (leads + analytics for a marketing site) and fully transparent/editable by hand; not a substitute for a relational database under high write volume or complex querying needs.
