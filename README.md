# theGenEx — AI Automation & Technology Agency

Marketing site + admin CRM/analytics workspace for theGenEx, an AI automation and technology agency.

```
TheGenEx/
├── frontend/   React + TypeScript site (Vite, pnpm workspace) — see frontend/artifacts/thegenex-site
├── backend/    Google Apps Script API (Leads / Analytics / Auth / Email over Google Sheets)
└── README.md
```

---

## 1. Architecture

```
                    ┌─────────────────────┐
                    │   theGenEx Website   │
                    │  React + TypeScript  │
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

- **Frontend**: `frontend/artifacts/thegenex-site` — React 19 + TypeScript + Vite + wouter routing + Tailwind. Unchanged in visual design; a small API/analytics/auth layer was added under `src/lib/`.
- **Backend**: `backend/*.gs` — a single Google Apps Script project deployed as a Web App. No servers, containers, or hosting bills.
- **Database**: One Google Sheet ("theGenEx Backend") with tabs `Leads`, `Visitors`, `PageViews`, `Events`, `Admins`, `Settings` (plus two internal tabs, `Sessions` and `Otp`, used for admin auth).
- **Email**: `MailApp` (no external SMTP, no extra credentials).

## 2. Frontend setup

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

**If `VITE_API_URL` is not set, the site runs in mock mode**: the contact form, analytics, and admin dashboard all work against local mock data (clearly labeled "Development mode" / "Mock data" in the UI) so the frontend is fully usable without a deployed backend. Production builds must set this variable to the real deployment URL.

All backend calls go through the single client at `src/lib/api.ts` — nothing else in the app talks to the network directly.

## 3. Google Sheet setup

1. Create a new Google Sheet, name it (e.g.) **theGenEx Backend**.
2. Leave it otherwise empty — the backend creates all required tabs and headers automatically the first time you run the setup script (step 4 below). The tabs it creates:
   - `Leads`, `Visitors`, `PageViews`, `Events`, `Admins`, `Settings` (per the spec)
   - `Sessions`, `Otp` (internal, used only for admin login — not part of the CRM data model)
3. Copy the spreadsheet ID from its URL: `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`.

## 4. Apps Script setup

1. In the Google Sheet, open **Extensions → Apps Script**.
2. Delete the default `Code.gs` content, then create each file listed below (**File → New → Script file**, matching names exactly) and paste in the matching file from `backend/`:
   - `Config.gs`, `Utils.gs`, `Auth.gs`, `Email.gs`, `Leads.gs`, `Analytics.gs`, `Dashboard.gs`, `Router.gs`, `Code.gs`
3. Open **Project Settings** (gear icon) → **Script Properties** → add:

   | Property | Value |
   |---|---|
   | `SPREADSHEET_ID` | the ID from step 3 above |
   | `APP_SECRET` | a long random string (e.g. `openssl rand -hex 32`) — used to sign admin session tokens and hash OTP codes |
   | `NOTIFICATION_EMAIL` | `infothegenex@gmail.com` (optional — also editable later via the `Settings` sheet) |
   | `SEED_ADMIN_EMAIL` | `infothegenex@gmail.com` (optional — defaults to this anyway) |

4. From the function dropdown in the toolbar, select `setupBackend_` and click **Run**. Grant the requested permissions when prompted (this is your own script acting on your own sheet/mailbox — no third party is involved). This creates all sheet tabs with headers, seeds default `Settings` rows, and adds the seed admin to the `Admins` sheet.
5. Click **Deploy → New deployment**:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the deployment's **Web app URL** — this is your `VITE_API_URL`.
7. Paste it into `frontend/artifacts/thegenex-site/.env` as shown in section 2.

To ship a backend code change later: edit the `.gs` files in the Apps Script editor, then **Deploy → Manage deployments → edit (pencil) → New version → Deploy**. The web app URL stays the same.

## 5. Email setup

- Notifications use `MailApp.sendEmail()`, which sends from the Google account that owns the Apps Script project (the account you used in step 4). No SMTP credentials are needed.
- The first time the script actually sends mail, Google may prompt for authorization again — approve it.
- `MailApp` has Google's standard daily sending quota for consumer Gmail accounts (100/day at time of writing) — sufficient for lead-notification volume. If you outgrow it, swap to `GmailApp` (same setup) or move to a transactional email provider later without changing the frontend.
- Client confirmation emails can be turned off without a redeploy by setting the `Settings` sheet row `send_confirmation_email` to `false`.

## 6. Admin setup

- The `Admins` sheet is the allowlist. `infothegenex@gmail.com` is seeded automatically by `setupBackend_`.
- **To add another admin**: add a row to the `Admins` sheet with that person's email, `role` = `admin`, `active` = `TRUE`. No redeploy needed.
- **Login flow** (no passwords, ever, anywhere in source): on `/admin`, an admin enters their email → the backend emails a 6-digit one-time code (valid 10 minutes) only if that email is on the allowlist → the admin enters the code → the backend issues a short-lived (12h), HMAC-signed session token. The token is verified server-side on every admin API call; nothing about admin identity or authorization lives in frontend code.

## 7. Running the project

```bash
# Frontend
cd frontend
pnpm install
cd artifacts/thegenex-site
cp .env.example .env   # then set VITE_API_URL
PORT=5000 BASE_PATH=/ pnpm run dev

# Typecheck / build
pnpm run typecheck
PORT=5000 BASE_PATH=/ NODE_ENV=production pnpm run build
```

Backend: no install/build step — it's plain Apps Script, edited and deployed from the Apps Script web editor as described in section 4.

## 8. Credentials & configuration you need to provide

None of these are invented or hardcoded anywhere in this codebase. You'll need to obtain/create them yourself:

| Credential | Where to get it | Where it goes | Why |
|---|---|---|---|
| `SPREADSHEET_ID` | Create the Google Sheet, copy the ID from its URL | Apps Script → Script Properties | Backend reads/writes this exact sheet |
| `APP_SECRET` | Generate yourself (`openssl rand -hex 32`) | Apps Script → Script Properties | Signs admin session tokens & OTP hashes — never put this in frontend code or git |
| Apps Script Web App URL | Apps Script editor → Deploy → New deployment | `frontend/artifacts/thegenex-site/.env` as `VITE_API_URL` | The one URL the frontend calls |
| Google account owning the Apps Script project | Your own / theGenEx's Google account | Used implicitly when you deploy ("Execute as: Me") | Determines which mailbox sends notification emails via MailApp |

Nothing else (no OAuth client IDs, no API keys, no database passwords) is required — that's the point of the Apps Script + Sheets architecture.

## 9. Known Apps Script limitations

- **Cold start latency**: the first request to a Web App after idle can take 1–3 seconds. Subsequent requests are fast.
- **No custom CORS headers on preflighted requests**: the API client avoids the problem by using GET for reads and a `text/plain` POST body (no preflight) for writes, per Apps Script's supported pattern.
- **No true concurrency control beyond `LockService`**: used around writes (lead submission, status updates, OTP issuance) to avoid race conditions; heavy concurrent traffic isn't this architecture's strength, but it comfortably handles a marketing site's contact/analytics volume.
- **Gmail/MailApp daily send quota**: fine for lead-volume notification email; not meant for bulk/marketing email.
- **No raw visitor IP**: Apps Script Web Apps do not expose the caller's IP to server code, so `ip_hash` stays blank unless a client explicitly provides one (not required, not trusted for security decisions).
- **Sheets as a database**: great for this scale (leads + analytics for a marketing site) and fully transparent/editable by hand; not a substitute for a relational database under high write volume or complex querying needs.
