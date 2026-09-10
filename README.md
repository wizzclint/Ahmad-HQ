# Ahmad HQ

The Next.js version of the Ahmad HQ operating system. It preserves the existing Google Sheets workflow while replacing the Apps Script HTML shell with a typed React console and server-side Sheets API adapter.

## Run locally

```bash
npm install
npm run dev
```

Without environment variables, the app runs with demo data so the UI can be reviewed safely. To connect the existing workbook, copy `.env.example` to `.env.local`, fill in the Google service account credentials, and share the workbook with that service account as an editor.

The adapter reads `WORK DESK — UPDATE` and `WEEK CLOSE — UPDATE` using the same header rows as the Apps Script app. `Add work` appends a new row to the work tab through `POST /api/hq`.

## Checks

```bash
npm run lint
npm run build
```
