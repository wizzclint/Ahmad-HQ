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
| `app/gardenia.tsx` | Gardenia's Fire sales pipeline: account card, add / edit, "Log a touch", follow-ups, board, summary, KPI numbers and the guided Weekly Closing |
| `lib/hq-pipeline.ts` | The pipeline rules: stages, finding columns by name, reading follow-up dates, follow-up groups, the client's headline numbers, weekly movement |
| `app/modal.tsx` | The dialog shared by the Edible and Gardenia's Fire screens |

## Edible store scorecard

The Edible - Store KPIs tab is the weekly operating report (`Report.xlsx`) as a live page. Three tabs feed it:

| Tab | What it holds |
|---|---|
| `HQ_EDIBLE_WEEKLY` | One row per week ending: net sales, sales target, orders, labor hours and cost, add-on orders, refunds, voids, and the channel sales (corporate / online, and optionally direct store). Raw numbers only |
| `HQ_EDIBLE_TARGETS` | Each KPI's definition, target and green/yellow thresholds |
| `HQ_EDIBLE_KSI_REVIEW` | The monthly score (-10 to +10) for each of the eight KSIs |

Manage weeks from the scorecard: **＋ Add week**, **Edit** and **Delete** sit beside the week picker (and on every row of the "All weeks" list, which shows 12 at a time, newest first, can be filtered by year, and flags any week that was skipped). Editing saves only the fields you changed. You can also edit the tabs directly in the sheet. Either way the scorecard recomputes everything else. A KPI with green/yellow thresholds is judged by them, a KPI with only a target is On track or Watch, and net sales is judged against that week's own sales target. The first column of each tab must stay unique per row.

**How the Edible - Store tabs connect** (all of it lives in `app/edible.tsx`, sharing one workspace so a dialog opens without leaving the tab):

- **Every number explains itself.** The **i** on a tile shows what it means, how it's worked out, where it comes from, its target and how its colour is decided. The wording comes from `HQ_EDIBLE_TARGETS` (Definition, Calculation, Primary Source, Owner, Notes) with plain built-in wording when a cell is blank.
- **Entering a week is guarded.** The date starts on the week after the latest one, each field shows the week before's value, and a mistyped digit (10x or a tenth of last week) or numbers that can't all be true (more add-ons than orders, labor above sales...) are pointed out first. Nothing is blocked: press "Save anyway" if the numbers are right.
- **A number that is off track leads to an action.** **＋ Action** beside a flagged number creates an ordinary Work item under "Edible Operations" (who, by when, expected result, and whether it needs Ahmad's decision, which also shows on Home). The number it answers is kept in the item's "WHY / OUTCOME SUPPORTED" cell as `KPI: <name> — <expected result>`, so the action is listed under that number, and the KPIs tab has an "Actions in progress" list of the store's open work.
- **Sales by channel and variance, as in the weekly report.** The report has two channels: corporate / online (one figure, from the channel sales report) and direct store, which it works out as net sales minus corporate / online. The week form has the same two boxes: type corporate / online sales and direct store sales are worked out (or type direct store and corporate / online is), with each channel's share of net sales ("Direct Sales %" and "Online Sales %") and its change from last week shown as you type. The KPIs tab shows a **Net sales variance** table (the report's Target Var $ / %, WoW % and YoY %, plus the 4-week average) and a **Sales by channel** table (dollars, % of net sales, the change since the entry before it in dollars, percent and points, the target share from the "Direct Sales %" and "Online Sales Mix" rows, and the gap between the two channels), with the last eight weeks in a fold-out. The entry checks point out figures that don't add up to net sales and a jump of 15+ points in the direct share, which usually means the corporate / online figure left something out. The Summary shows both shares and a saved wrap-up keeps the mix.
- **Summary** opens with "Store health": the latest week's colour counts, four headline numbers and what needs attention.
- **Weekly Closing** walks through the week: the numbers, what they say, what is being done about it, then the wrap-up. "Fill in from the numbers and actions" drafts the four boxes (misses from the flagged numbers, blockers from actions that need a decision or are blocked, next week from the other open actions). The wrap-up is saved under the ISO week of the week being closed, with the week's headline numbers kept in it.

## Gardenia's Fire sales pipeline

The Sales Pipeline tab reads `HQ_GARDENIA_PIPELINE` (one row per prospect; the first column, the account name, is its key). Columns are found **by name**, so a column the client adds or renames still appears on the account card, the form and the "All columns" table without a code change; the standard fourteen are Account / Prospect, Stage, Contact / Company, Last Contact, Next Follow-up, Tasting / Sample, Standing Cadence, Revenue / Value, Risk, Owner, Source / Evidence, Notes, Phone and Email. Phone and Email sit under "Who" on the card; a real number or address becomes a tap-to-call / tap-to-email link, and a **Call** button appears on follow-up rows and board cards.

The Gardenia's Fire page has five tabs: Summary, Tasks, Sales Pipeline, Weekly Closing and KPIs. The pipeline is the one list of prospects and won accounts (First Order Won, Recurring Won), so there is no separate Customers tab for Gardenia's Fire: the client plans to take orders and customers from Shopify, and HQ only keeps the management view. `HQ_CUSTOMERS`, `HQ_CUSTOMER_FOLLOWUP`, `HQ_CUSTOMER_ISSUES` and `HQ_GARDENIA_PRODUCT` stay in the spreadsheet untouched, and a tab can be brought back with one line in `AREA_PAGES`. The KPIs and Weekly Closing tabs show their register tables only when they hold rows.

- **Three views:** *Follow-ups* (default: overdue, today, this week, later, no date), *Board* (the eight stages in one row that scrolls sideways; drag a card, or use its Move-to dropdown on a phone) and *All columns* (every column, sortable). Search and a "My accounts" filter apply to all three.
- **The account card** shows every column in five groups (Who, Where it stands, Follow-up, Offer, Evidence and notes), with its tasks and recent activity, and is where an account is edited or deleted. Anything the sheet has that fits no group goes under "More details".
- **Log a touch** is one action that stamps Last Contact with today, adds a dated line to the top of Notes (`2026-09-24 · Cathy · Call (reached): …`), sets the next follow-up and can move the stage. Nothing moves unless the person leaves the suggestion selected.
- **Follow-up dates:** the sheet's Next Follow-up column is free text, so the app reads a date only when it is complete (`2026-09-30`, `9/30/2026`, `Sep 30, 2026`) and never guesses. It writes `2026-09-30 · what happens`; older text with no date shows under "No date set".
- **History:** stage moves, touches and new accounts are written to `HQ_ACTIVITY` (`Stage Moved`, `Touch Logged`, `Account Added`, Source Type `HQ_GARDENIA_PIPELINE`). Weekly Closing and the "reached someone" count are read from it; Home's Recent Activity shows moves and new accounts.
- **Connected to the rest of the page:** Summary shows the client's own numbers (Prospects Identified, Contacts Made, Tastings, Standing Accounts; Weekly Revenue says "Not reported" until orders are connected), this month's test and what is due; KPIs adds the stage funnel; **＋ Task** on an account makes a Gardenia task whose Notes cell starts `Account: <name>` (that tag is how the account finds its tasks); Weekly Closing drafts wins, misses, blockers and next steps from the week's movement and saves the wrap-up under that ISO week.
- **This month's test** is kept as a `HQ_NOTES` row with Source Type `MONTH TEST`; the newest one is shown and anyone can update it from the Summary.

## Checks

```bash
npm run lint
npm run build
```
