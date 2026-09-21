# Ahmad HQ

The operating system for Ahmad's businesses: a Next.js app that reads and writes a Google Spreadsheet, which stays the single source of truth. Each business area (Edible - Store, Gardenia's Fire, Finance & Office, Iron Marks, ...) has its own page, and Home summarises progress across all of them.

## How it fits together

```text
Browser (React UI, app/page.tsx)
  -> Next.js API (app/api/hq)
    -> Google Sheets API (lib/hq-data.ts)
      -> the spreadsheet: one tab per register (HQ_*), plus the work desk and week close
```

- **Sign-in:** NextAuth with Google (`app/api/auth/[...nextauth]`). A user's role and area come from the `HQ_ACCESS` tab.
- **Sheets access:** an OAuth refresh token (`lib/hq-auth.ts`). Locally it is stored in `tokens.json` after you visit `/auth/login`; on Vercel it comes from `GOOGLE_REFRESH_TOKEN`.
- **Reads** are one batched request, cached for 15 seconds; every write clears the cache (`lib/hq-data.ts`).
- **Demo mode:** with no Google credentials configured, the app shows sample data and writes nothing.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Create `.env.local` with:

| Variable | What it is |
|---|---|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth client from Google Cloud |
| `GOOGLE_REDIRECT_URI` | The `/auth/callback` URL for this environment |
| `GOOGLE_SHEETS_ID` | The spreadsheet's ID |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | NextAuth settings |
| `GOOGLE_REFRESH_TOKEN` | Production only (Vercel). Not needed locally |
| `GOOGLE_WORK_SHEET`, `GOOGLE_CLOSE_SHEET` | Optional. Override the work-desk and week-close tab names |

Then open `/auth/login` once and sign in with the Google account that can edit the spreadsheet; this writes `tokens.json`.

## Deploying (Vercel)

Set the same variables in the project's Environment Variables, including `GOOGLE_REFRESH_TOKEN` (copy `refresh_token` from `tokens.json`), then redeploy. If the site shows `invalid_grant`, the refresh token has expired: sign in locally again, replace the variable, and redeploy. Publishing the OAuth consent screen ("In production" in Google Cloud) stops tokens expiring weekly.

## Layout

| Path | What lives there |
|---|---|
| `app/page.tsx` | The main UI: pages, boards, forms |
| `app/shell.tsx` | App frame: sidebar on desktop, drawer on phones |
| `app/charts.tsx` | Home progress charts, and the line chart the store scorecard reuses |
| `app/edible.tsx` | Edible - Store KPI scorecard, monthly KSI review and the "add a week" form |
| `app/api/hq/route.ts` | The one data API (GET/POST/PUT/DELETE); every method requires sign-in |
| `app/api/hq/maintenance/route.ts` | "Run Maintenance": generates the missing daily/weekly/monthly checklist runs |
| `lib/hq-data.ts` | All Google Sheets reads and writes, caching |
| `lib/hq-progress.ts` | The maths behind the progress charts |
| `lib/hq-scorecard.ts` | The store scorecard maths: average ticket, labor %, status colours and so on, computed from the raw weekly numbers |
| `lib/hq-schemas.ts` | Columns of the tabs the app itself owns (`HQ_EDIBLE_*`) |

## Edible store scorecard

The Edible - Store KPIs tab is the weekly operating report (`Report.xlsx`) as a live page. Three tabs feed it:

| Tab | What it holds |
|---|---|
| `HQ_EDIBLE_WEEKLY` | One row per week ending: net sales, sales target, orders, labor hours and cost, add-on orders, refunds, voids, online sales. Raw numbers only |
| `HQ_EDIBLE_TARGETS` | Each KPI's definition, target and green/yellow thresholds |
| `HQ_EDIBLE_KSI_REVIEW` | The monthly score (-10 to +10) for each of the eight KSIs |

Add a week with the form on that tab (or edit the tabs directly in the sheet); the scorecard recomputes everything else. A KPI with green/yellow thresholds is judged by them, a KPI with only a target is On track or Watch, and net sales is judged against that week's own sales target. The first column of each tab must stay unique per row.

## Checks

```bash
npm run lint
npm run build
```
