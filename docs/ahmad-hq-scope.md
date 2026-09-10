# Ahmad HQ Application Scope

## Purpose

Ahmad HQ is an internal operating system for capturing work, managing operating areas, reviewing controls, and escalating exceptions. The project is migrating the existing Google Apps Script application to a modern Next.js application while keeping Google Sheets as the operational data store.

The intended result is:

```text
Next.js React application
  -> Next.js server API
    -> Google Sheets and Google Drive APIs
```

The old Apps Script application is being replaced as the application layer. The spreadsheet and related Drive workflow remain part of the ecosystem.

## Current Application

The current Next.js application provides these views:

- **Home**: management summary, open work count, critical moves, exceptions, controls due, and operating-area cards.
- **My Work**: all work items with status, owner, due date, and exception indicators.
- **Operate**: work filtered by operating function or project.
- **Close / Review**: review and control items from the close sheet.
- **Add Work**: capture a new work item and append it to the work desk.

Work rows and control rows have inline editing controls. The current UI can edit the fields supported by the original Apps Script functions.

## Current API

The application exposes one Next.js route at `/api/hq`:

- `GET /api/hq`: loads the work desk and close/review controls.
- `POST /api/hq`: adds a new work item.
- `PUT /api/hq`: updates an existing work item or control by ID.

The API is server-side. Google credentials are never sent to the browser.

## Current Google Sheets Scope

The configured spreadsheet is identified by `GOOGLE_SHEETS_ID`. The application currently communicates with two tabs:

### `WORK DESK — UPDATE`

The app reads work items and can update:

- `Status`
- `Waiting On`
- `Blocked?`
- `Result / Completion Note`
- `Evidence / Drive Link`
- `PLANNED DAY`
- `WHY / OUTCOME SUPPORTED`
- `Last Update`
- `COMPLETED AT` when work is marked Done or Completed

New work is appended to this tab using the existing 21-column structure from the Apps Script application.

### `WEEK CLOSE — UPDATE`

The app reads controls and can update:

- `Status`
- `Evidence / Link`
- `Exception?`
- `Notes / Next Action`

Rows are located by the ID in the first column, matching the original Apps Script behavior.

## Credentials

The current integration is designed for a Google Cloud service account. The following values are configured in `.env.local` and must never be committed:

```env
GOOGLE_SHEETS_ID=spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
GOOGLE_WORK_SHEET=WORK DESK — UPDATE
GOOGLE_CLOSE_SHEET=WEEK CLOSE — UPDATE
GOOGLE_USER_EMAIL=you@example.com
```

`GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_PRIVATE_KEY` are required for a live Sheets connection. The worksheet names have defaults but can be overridden. `GOOGLE_USER_EMAIL` is display metadata and is not an authentication credential.

The spreadsheet must be shared with the service account email as an Editor. The Google Sheets API must be enabled in the associated Google Cloud project.

When credentials are missing or still contain placeholders, the application runs in demo mode in both development and production. As soon as valid configuration is added to the deployment, the same application automatically switches to the live Google Sheets source. Demo mode does not read from or write to the real workbook.

## Security Model

The current security baseline includes:

- Google credentials kept on the server.
- Environment files ignored by Git.
- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: DENY`.
- Strict referrer policy.
- Restricted browser permissions policy.
- JSON-only write requests.
- Request body size limit.
- Explicitly allowed update types: `work` and `control`.
- Server-side row lookup by ID.

Authentication and authorization are not yet implemented. Before public or broad internal deployment, the app needs identity protection so only approved users can access it. Recommended future options include Google OAuth, an organization identity provider, or deployment behind a private network.

## Google Drive Scope

The application does not currently browse, upload, download, or edit arbitrary Google Drive files. The `Evidence / Drive Link` and `Evidence / Link` fields currently store links or text values in Sheets.

Planned Drive capabilities may include:

- Search files in an Ahmad HQ Drive folder.
- Select a Drive file as evidence from the app.
- Upload evidence files.
- Display file names, links, and metadata.
- Rename or organize files where appropriate.

Drive API access should be added through the same server-side boundary. Drive API handles files and folders; specialized APIs are needed to edit the contents of Google Docs, Slides, or Sheets.

## Legacy Apps Script

The original Apps Script contains the behavior being migrated:

- `getBootstrap()` reads both Sheets tabs.
- `saveWork(update)` updates work fields.
- `saveControl(update)` updates close/review fields.
- `addWork(item)` appends a new work row.
- `AhmadHQ_Index.html` provides the original browser interface.

The Apps Script is not required to run the new Next.js application. Its source files are useful as migration references and backup until the Next.js application has been tested against the real workbook.

The Apps Script API is not part of the current scope. It would only be needed if the new application were intended to edit or deploy the legacy Apps Script project itself.

## Planned Updates

### Near term

- Configure and verify the live Google Sheets connection.
- Test reading, adding, and updating rows in the real workbook.
- Add clear save states and error recovery in the UI.
- Add authentication and authorization.
- Add audit logging for operational changes.

### Next integration phase

- Add Google Drive file search and evidence attachment.
- Support uploads where the operating workflow requires them.
- Link Drive evidence to work and control records consistently.
- Add stronger schema validation for incoming work and control updates.

### Longer term

- Add filtering by status, owner, due date, and exception state.
- Add richer function/project drill-downs.
- Add review history and change tracking.
- Add notifications or scheduled reminders if the workflow requires them.
- Archive the Apps Script files after the Next.js application fully replaces the old deployment.

## Project Management Plan

### Current Status

| Area                       | Status                           | Notes                                                                                    |
| -------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------- |
| Next.js application shell  | Complete                         | React interface includes Home, My Work, Operate, Close / Review, and Add Work.           |
| Sheets read integration    | Implemented, pending credentials | Reads the two configured worksheet tabs through the server API.                          |
| Add Work integration       | Implemented, pending credentials | Appends a row using the existing 21-column work-tab structure.                           |
| Work editing               | Implemented, pending credentials | Migrates the editable fields from `saveWork()`.                                          |
| Control editing            | Implemented, pending credentials | Migrates the editable fields from `saveControl()`.                                       |
| Demo mode                  | Complete                         | Runs in development and production when configuration is missing or placeholder.         |
| Security baseline          | Initial                          | Server-only credentials, headers, request validation, and update allowlists are present. |
| User authentication        | Not started                      | Required before broad internal or public deployment.                                     |
| Google Drive integration   | Not started                      | Evidence fields currently store links in Sheets only.                                    |
| Live workbook verification | Blocked                          | Requires a valid service-account email, private key, and workbook sharing.               |

### Workstreams

#### Workstream 1: Live Sheets Connection

**Objective:** Connect the Next.js server to the existing workbook without changing the operating data model.

**Tasks:**

1. Create or select a Google Cloud project.
2. Enable the Google Sheets API.
3. Create a service account and download its JSON key securely.
4. Add the service-account email and complete private key to local `.env.local` and Vercel environment variables.
5. Share the spreadsheet with the service-account email as Editor.
6. Confirm the worksheet names exactly match `WORK DESK — UPDATE` and `WEEK CLOSE — UPDATE`.
7. Test `GET /api/hq` and confirm the response reports `source: "sheets"`.

**Definition of done:** The deployed app reads real work and control rows, with no credentials exposed to the browser.

#### Workstream 2: Functional Parity

**Objective:** Replace the Apps Script app’s daily workflow with the Next.js app.

**Tasks:**

1. Test adding one controlled work item.
2. Test editing each supported work field.
3. Test marking work Done or Completed and confirm timestamp updates.
4. Test editing each supported close/review field.
5. Confirm updates appear in the workbook and survive a page reload.
6. Compare the result with the legacy Apps Script behavior.

**Definition of done:** A normal user can perform the existing capture, update, and close/review workflow entirely from Next.js.

#### Workstream 3: Identity and Internal Access

**Objective:** Ensure only approved internal users can access the application.

**Tasks:**

1. Choose an access model: Google OAuth, organization identity provider, or private network/Vercel access protection.
2. Protect the page and all `/api/hq` methods, not only the browser UI.
3. Define the approved user or group list.
4. Return unauthorized responses without revealing workbook details.
5. Test signed-out, unauthorized, and authorized access.

**Definition of done:** An unauthenticated or unauthorized user cannot read or write Ahmad HQ data.

#### Workstream 4: Reliability and Auditability

**Objective:** Make operational changes understandable and recoverable.

**Tasks:**

1. Add visible loading, saving, success, and failure states.
2. Prevent duplicate submissions.
3. Validate field values and maximum lengths on the server.
4. Add structured server logs without logging credentials or sensitive row contents.
5. Decide whether a separate audit log should be stored in Sheets or another service.
6. Add backup or rollback guidance for accidental edits.

**Definition of done:** Users receive clear feedback and administrators can investigate failed or unexpected changes.

#### Workstream 5: Drive Evidence Integration

**Objective:** Turn evidence links into a managed Google Drive workflow.

**Tasks:**

1. Identify the Ahmad HQ Drive folder or shared drive.
2. Decide whether the service account or user OAuth should own file access.
3. Add Drive API access on the server.
4. Add file search and selection to work/control editing.
5. Store stable Drive file IDs as well as display links where appropriate.
6. Add upload support only after access and retention rules are defined.

**Definition of done:** A user can find or attach approved Drive evidence from the app, and the associated Sheet record remains traceable.

### Milestones

#### Milestone 0: Demo Review

**Status:** Complete.

The deployed app can be reviewed with demo data. No real Google credentials or workbook writes are involved.

#### Milestone 1: Credential and Connection Readiness

**Status:** Pending credentials.

**Exit criteria:** Google Cloud API is enabled, service account is created, workbook access is granted, Vercel variables are configured, and `/api/hq` returns live data.

#### Milestone 2: Operational Cutover

**Status:** Not started.

**Exit criteria:** Add, edit, status completion, control review, and reload verification pass against the real workbook. The Next.js URL becomes the primary operating URL.

#### Milestone 3: Internal Security Release

**Status:** Not started.

**Exit criteria:** Authentication and authorization protect both UI and API, and unauthorized access tests pass.

#### Milestone 4: Drive-Enabled Workflow

**Status:** Not started.

**Exit criteria:** Drive evidence can be searched or attached through the app with clear ownership and permission behavior.

### Cutover Checklist

- [ ] Valid `GOOGLE_SHEETS_ID` configured.
- [ ] Valid `GOOGLE_SERVICE_ACCOUNT_EMAIL` configured.
- [ ] Complete `GOOGLE_PRIVATE_KEY` configured securely.
- [ ] Google Sheets API enabled.
- [ ] Spreadsheet shared with the service account as Editor.
- [ ] `WORK DESK — UPDATE` exists with the expected header row at row 5.
- [ ] `WEEK CLOSE — UPDATE` exists with the expected header row at row 1.
- [ ] Local `GET /api/hq` returns `source: "sheets"`.
- [ ] Vercel environment variables configured for the deployed environment.
- [ ] Vercel redeployed after environment changes.
- [ ] Add Work tested against the real workbook.
- [ ] Work edit tested against the real workbook.
- [ ] Control edit tested against the real workbook.
- [ ] Authentication enabled before broad internal use.
- [ ] Apps Script URL retained as rollback until cutover sign-off.

### Risks and Decisions

| Risk or decision                            | Impact                                           | Mitigation / owner decision                                                           |
| ------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Service-account key is malformed or missing | App remains in demo mode or cannot authenticate  | Validate locally, store separately in Vercel, and never commit the key.               |
| Workbook headers or tab names change        | Reads or updates may stop working                | Treat the workbook layout as an API contract and verify it before cutover.            |
| Multiple users edit the same row            | Last write may overwrite another change          | Add audit history or conflict detection if concurrent editing becomes common.         |
| App is deployed without authentication      | Anyone with the URL may access the UI/API        | Keep deployment restricted until identity protection is implemented.                  |
| Google API becomes unavailable              | Reads and writes fail temporarily                | Show clear errors, preserve the Apps Script rollback path, and consider retry policy. |
| Drive ownership and sharing are unclear     | Evidence files may be inaccessible or duplicated | Define the folder/shared-drive model before implementing uploads.                     |

### Change Control

Until Milestone 2 is signed off, the Apps Script deployment remains the rollback system. Changes to worksheet names, header positions, or the 21-column work structure should be treated as breaking changes and reflected in this document before implementation.

The local `Ahmad HQ` folder is reference material, not an application dependency. It can be moved out of the codebase, but the legacy source files should be retained in an archive until the cutover checklist is complete.

## Out of Scope for the Current Version

The current version does not include:

- Editing arbitrary Google Drive documents.
- Editing Google Docs or Slides content.
- Managing Apps Script source or deployments.
- User authentication.
- Multi-tenant organization support.
- A replacement database separate from Google Sheets.
- Automatic migration or deletion of files in Google Drive.

## Operational Data Flow

```text
User browser
  -> React interface
    -> /api/hq
      -> Google Sheets API
        -> configured spreadsheet
          -> WORK DESK — UPDATE
          -> WEEK CLOSE — UPDATE
```

When Drive integration is added:

```text
User browser
  -> React interface
    -> Next.js server API
      -> Google Sheets API for operational records
      -> Google Drive API for files and folders
```

The local `Ahmad HQ` folder is not used at runtime. It can be moved out of the codebase and retained as an archive or reference set. The actual remote spreadsheet remains the active data source once valid credentials and permissions are configured.
