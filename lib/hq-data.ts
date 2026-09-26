import type { HqBootstrap, SheetRow, HqUser } from "./hq-types";
import { periodInfo } from "./hq-period";

const demoWork: SheetRow[] = [
  { ID: "W-001", "Project / Function": "Gardenia's Fire", "Work Item / Next Action": "Confirm sellable offer is ready from Emmanuel's real-life process; capture only price/cost/margin or constraints needed for selling/management", Owner: "Emmanuel", Type: "Operating Result", Priority: "PUSH", "Critical Move?": "Yes", "Result Producing?": "Yes", "Due Date": "Mon Aug 31", Status: "In Progress", "Management Escalation?": "No", "Blocked?": "No", "Evidence / Drive Link": "https://drive.google.com/drive/folders/1-CWhZsNUR2dnbbCLLOInkSOOHtFU_utm", "WHY / OUTCOME SUPPORTED": "Sales readiness / management economics without duplicating product development" },
  { ID: "W-002", "Project / Function": "Gardenia's Fire", "Work Item / Next Action": "Build/confirm target account list", Owner: "Emmanuel", Type: "Project Action", Priority: "PUSH", "Critical Move?": "Yes", "Result Producing?": "Yes", "Due Date": "Tue Sep 1", Status: "Open", "Management Escalation?": "No", "Evidence / Drive Link": "https://drive.google.com/drive/folders/1LvDMFZKtN8Os89nodgQhUsqinqHelkRm", "WHY / OUTCOME SUPPORTED": "Create qualified sales pipeline" },
  { ID: "W-003", "Project / Function": "Gardenia's Fire", "Work Item / Next Action": "Begin outreach and schedule tastings", Owner: "Emmanuel", Type: "Project Action", Priority: "PUSH", "Critical Move?": "Yes", "Result Producing?": "Yes", "Due Date": "Fri Sep 4", Status: "Open", "Evidence / Drive Link": "https://drive.google.com/drive/folders/1LvDMFZKtN8Os89nodgQhUsqinqHelkRm", "WHY / OUTCOME SUPPORTED": "Create tastings / standing-account conversations" },
  { ID: "W-004", "Project / Function": "Edible Operations", "Work Item / Next Action": "Execute labor schedule correction and verify effect", Owner: "Emmanuel", Type: "Improvement", Priority: "MAINTAIN", "Critical Move?": "Yes", "Result Producing?": "Yes", "Due Date": "Wed Sep 2", Status: "In Progress", "Management Escalation?": "Yes", "Blocked?": "No", "Evidence / Drive Link": "https://docs.google.com/spreadsheets/d/1_qBjYd0F4BYYTxLMJjEZbQynBdHH5JGe83-U7nheJOE/edit?usp=drivesdk", "WHY / OUTCOME SUPPORTED": "Bring labor productivity toward target" },
  { ID: "W-005", "Project / Function": "Finance & Office", "Work Item / Next Action": "Confirm books/reconciliations/evidence current for weekly close", Owner: "Moises", Type: "Control", Priority: "PUSH", "Critical Move?": "Yes", "Result Producing?": "No", "Due Date": "Fri Sep 4", Status: "Open", "Evidence / Drive Link": "https://docs.google.com/spreadsheets/d/1zrY3SOQiF2g8A_7z4ynA9mVnM7_qsvS8eBsebBRplmc/edit?usp=drivesdk", "WHY / OUTCOME SUPPORTED": "Reliable finance close / no silent issue" },
  { ID: "W-006", "Project / Function": "Finance & Office", "Work Item / Next Action": "Review open creditors / obligations with Emmanuel", Owner: "Moises", Type: "Follow-up", Priority: "PUSH", "Due Date": "Thu Sep 3", Status: "Open", "Waiting On": "Emmanuel", "Evidence / Drive Link": "https://docs.google.com/spreadsheets/d/1zrY3SOQiF2g8A_7z4ynA9mVnM7_qsvS8eBsebBRplmc/edit?usp=drivesdk", "WHY / OUTCOME SUPPORTED": "Visibility of obligations / decisions" },
  { ID: "W-007", "Project / Function": "Podcast / Legacy", "Work Item / Next Action": "Move current video/editor follow-up to next executable step", Owner: "Emmanuel", Type: "Project Action", Priority: "PUSH", Status: "Open", "Waiting On": "Ahmad", "WHY / OUTCOME SUPPORTED": "Move production pipeline forward" },
  { ID: "W-008", "Project / Function": "Ahmad Personal Finance / Life", "Work Item / Next Action": "Establish lightweight personal bills / obligations source map and weekly control", Owner: "Moises", Type: "Control Build", Priority: "PUSH", "Due Date": "Fri Sep 4", Status: "Open", "WHY / OUTCOME SUPPORTED": "Personal stability / obligations visibility" },
  { ID: "W-009", "Project / Function": "Ahmad Personal Finance / Life", "Work Item / Next Action": "Review subscriptions / recurring charges and surface cancellations or decisions needed", Owner: "Emmanuel", Type: "Follow-up", Priority: "PUSH", "Critical Move?": "Yes", "Due Date": "Wed Sep 2", Status: "Open", "WHY / OUTCOME SUPPORTED": "Reduce unnecessary recurring outflow" },
  { ID: "W-010", "Project / Function": "People / Systems", "Work Item / Next Action": "Operate Monday launch from HQ role views; confirm owners, dates, blockers and exceptions are current", Owner: "Emmanuel", Type: "System Rollout", Priority: "PUSH", "Due Date": "Mon Aug 31", Status: "Open", "WHY / OUTCOME SUPPORTED": "Make the operating system usable through real work" },
  { ID: "W-011", "Project / Function": "My Work", "Work Item / Next Action": "Action", Owner: "", Type: "Action", Priority: "PUSH", Status: "Open" },
];

const demoControls: SheetRow[] = [
  { ID: "C-001", "Project / Function": "Finance & Office", Control: "Books current / posted through agreed close date", Owner: "Moises", Cadence: "Weekly", Status: "Open", "Evidence / Link": "https://docs.google.com/spreadsheets/d/1_zaAT-zqEQhwTW2ZNRLSnH8Peed7zZTzi3kd0RUHQRQ/edit", "Exception?": "No" },
  { ID: "C-002", "Project / Function": "Finance & Office", Control: "Bank and credit-card reconciliations current", Owner: "Moises", Cadence: "Weekly", Status: "Open", "Evidence / Link": "https://docs.google.com/spreadsheets/d/1zrY3SOQiF2g8A_7z4ynA9mVnM7_qsvS8eBsebBRplmc/edit", "Exception?": "No" },
  { ID: "C-003", "Project / Function": "Finance & Office", Control: "Critical A/P and A/R reviewed", Owner: "Moises", Cadence: "Weekly", Status: "Open", "Exception?": "No" },
  { ID: "C-004", "Project / Function": "Finance & Office", Control: "Evidence / supporting documents confirmed", Owner: "Moises", Cadence: "Weekly", Status: "Open", "Evidence / Link": "https://docs.google.com/spreadsheets/d/1zrY3SOQiF2g8A_7z4ynA9mVnM7_qsvS8eBsebBRplmc/edit", "Exception?": "No" },
  { ID: "C-005", "Project / Function": "Edible Operations", Control: "Week Close completed and exceptions identified", Owner: "Emmanuel", Cadence: "Weekly", Status: "Open", "Evidence / Link": "https://docs.google.com/spreadsheets/d/1_qBjYd0F4BYYTxLMJjEZbQynBdHH5JGe83-U7nheJOE/edit", "Exception?": "No" },
  { ID: "C-006", "Project / Function": "People / Systems", Control: "Critical Moves reviewed; overdue/blocked escalated", Owner: "Emmanuel", Cadence: "Weekly", Status: "Open", "Exception?": "No" },
  { ID: "C-007", "Project / Function": "Ahmad Personal Finance / Life", Control: "Upcoming personal bills/obligations reviewed", Owner: "Moises", Cadence: "Weekly", Status: "Open", "Exception?": "No" },
  { ID: "C-008", "Project / Function": "Ahmad Personal Finance / Life", Control: "Money-in / money-out and material exceptions reviewed", Owner: "Moises", Cadence: "Weekly", Status: "Open", "Exception?": "No" },
  { ID: "C-009", "Project / Function": "Ahmad Personal Finance / Life", Control: "Personal-finance exceptions / deadlines reviewed and escalated to Ahmad", Owner: "Emmanuel", Cadence: "Weekly", Status: "Open", "Exception?": "No", "Notes / Next Action": "Coordinate completeness and decisions; do not duplicate bookkeeping" },
];

async function hasSheetsConfig(): Promise<boolean> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_SHEETS_ID) {
    return false;
  }
  const { loadTokens } = await import("@/lib/hq-auth");
  const tokens = await loadTokens();
  return Boolean(tokens?.refresh_token);
}

async function isDemoData(): Promise<boolean> {
  return !(await hasSheetsConfig());
}

function rowsFromValues(values: string[][]) {
  const headers = values[0] ?? [];
  return values.slice(1).filter((row) => row.some(Boolean)).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

async function getSheets() {
  const { google } = await import("googleapis");
  const { getValidClient } = await import("@/lib/hq-auth");
  const auth = await getValidClient();
  return google.sheets({ version: "v4", auth });
}

export async function readSheet(sheetName: string, headerRow: number, width: string) {
  const response = await (await getSheets()).spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEETS_ID, range: `${sheetName}!A${headerRow}:${width}` });
  return rowsFromValues((response.data.values ?? []) as string[][]);
}

// ── Read-quota protection ────────────────────────────────────────────────
// Google allows ~60 read requests per minute per user. A page load used to make ~35
// (one per tab), so two quick reloads hit the limit. Now: one metadata request (cached),
// one batched read for every tab, and a short in-memory cache in front of that.

/** Tab title -> numeric sheetId, cached briefly. Doubles as the list of tabs that exist. */
let sheetIndex: { at: number; gids: Map<string, number> } | null = null;
const SHEET_INDEX_TTL_MS = 60_000;

async function sheetGids(sheets: Awaited<ReturnType<typeof getSheets>>, force = false): Promise<Map<string, number>> {
  if (!force && sheetIndex && Date.now() - sheetIndex.at < SHEET_INDEX_TTL_MS) return sheetIndex.gids;
  const meta = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEETS_ID, fields: "sheets.properties(sheetId,title)" });
  const gids = new Map<string, number>();
  for (const s of meta.data.sheets ?? []) {
    if (s.properties?.title != null && s.properties.sheetId != null) gids.set(s.properties.title, s.properties.sheetId);
  }
  sheetIndex = { at: Date.now(), gids };
  return gids;
}

type ReadSpec = { name: string; headerRow: number; width: string; required?: boolean };

/**
 * Read many tabs in a single batchGet. Tabs that don't exist come back empty (matching the old
 * per-tab `.catch(() => [])`), so one missing tab can't fail the whole request — unless the
 * spec is `required`, which keeps the old behaviour of failing loudly (e.g. a mistyped
 * GOOGLE_WORK_SHEET).
 */
async function readMany(specs: ReadSpec[]): Promise<SheetRow[][]> {
  const sheets = await getSheets();
  const gids = await sheetGids(sheets);
  const missing = specs.find((s) => s.required && !gids.has(s.name));
  if (missing) throw new Error(`Sheet not found: ${missing.name}`);

  const present = specs.filter((s) => gids.has(s.name));
  const res = present.length
    ? await sheets.spreadsheets.values.batchGet({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID,
        ranges: present.map((s) => `'${s.name.replace(/'/g, "''")}'!A${s.headerRow}:${s.width}`),
      })
    : null;
  const byName = new Map(present.map((s, i) => [s.name, rowsFromValues((res?.data.valueRanges?.[i]?.values ?? []) as string[][])]));
  return specs.map((s) => byName.get(s.name) ?? []);
}

/** Whole-workspace snapshot cache. Writes call invalidateBootstrapCache() so you always see your own changes. */
const BOOTSTRAP_TTL_MS = 15_000;
const BOOTSTRAP_STALE_OK_MS = 10 * 60_000; // if Google errors, serve data up to this old rather than a broken page
let bootstrapCache: { at: number; data: HqBootstrap } | null = null;
let bootstrapInFlight: Promise<HqBootstrap> | null = null;
let cacheGeneration = 0;

export function invalidateBootstrapCache() {
  cacheGeneration++;
  bootstrapCache = null;
  bootstrapInFlight = null;
}

/**
 * The server is the sole authority for work item IDs — never trust a
 * client-supplied ID. Reads the current sheet, finds the highest existing
 * W-### number, and returns the next one. (A client-generated ID here
 * previously let the browser's temporary "LOCAL-<timestamp>" placeholder
 * get saved permanently, and let two near-simultaneous submits collide on
 * the same fallback ID.)
 */
async function nextWorkId(): Promise<string> {
  const sheetName = process.env.GOOGLE_WORK_SHEET ?? "WORK DESK — UPDATE";
  // No fallback if this read fails (a busy moment, a dropped connection): guessing "W-001" would hand out an ID that
  // already exists, and edits/deletes act on the first row with a matching ID. Let the save fail so it can be retried.
  const rows = await readSheet(sheetName, 5, "U");
  const highest = rows.reduce((max, row) => {
    const match = /^W-(\d+)$/.exec(row.ID || "");
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `W-${String(highest + 1).padStart(3, "0")}`;
}

/**
 * Google Sheets treats a typed value that starts with = + or @ as a formula. Nobody typing a task or a note means that,
 * and a crafted one could read other cells or call out to the web. A leading apostrophe stores it as plain text
 * (the apostrophe itself isn't kept). Numbers, dates and negative numbers are left alone.
 */
const asText = (v: unknown): unknown => (typeof v === "string" && /^[=+@]/.test(v) ? `'${v}` : v);

/** "A", "B", ... "Z", "AA" for a 0-based column index. */
function columnLetter(index: number): string {
  let s = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

// Optional fields default to what every new item has always had, so existing callers (Capture) behave exactly as before.
// A yes/no cell only ever becomes "Yes" or "No", whatever the caller sent.
const yesNo = (v: string | undefined, fallback: "Yes" | "No") => (v === undefined || v === "" ? fallback : /^y/i.test(v) ? "Yes" : "No");

export async function addWork(item: SheetRow) {
  if (await isDemoData()) return { ok: true, source: "demo" as const, id: `W-${Date.now()}` };
  const id = await nextWorkId();
  const now = new Date().toISOString();
  const row = [id, item["Project / Function"], item["Work Item / Next Action"], item.Owner, item.Type || "Action", item.Priority || "PUSH", yesNo(item["Critical Move?"], "No"), "Yes", item["Due Date"], "Open", "", "No", "", "", now, now, yesNo(item["Management Escalation?"], "No"), "", item["WHY / OUTCOME SUPPORTED"] || "", "", "0d"].map(asText);
  await (await getSheets()).spreadsheets.values.append({ spreadsheetId: process.env.GOOGLE_SHEETS_ID, range: `${process.env.GOOGLE_WORK_SHEET ?? "WORK DESK — UPDATE"}!A:U`, valueInputOption: "USER_ENTERED", requestBody: { values: [row] } });
  invalidateBootstrapCache();
  return { ok: true, source: "sheets" as const, id };
}

async function updateRow(sheetName: string, headerRow: number, width: string, id: string, changes: Record<string, string>) {
  if (await isDemoData()) return { ok: true, source: "demo" as const, id };
  const sheets = await getSheets();
  const values = (await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEETS_ID, range: `${sheetName}!A${headerRow}:${width}` })).data.values as string[][] | undefined;
  const headers = values?.[0] ?? [];
  const rowIndex = values?.findIndex((row, index) => index > 0 && row[0] === id) ?? -1;
  if (rowIndex < 0) throw new Error(`Row not found: ${id}`);
  // Write ONLY the cells that changed. Rewriting the whole row from what the sheet displays would flatten formulas,
  // re-date dates shown without a year, round numbers to their display format, and turn text that merely looks like
  // a formula into a real one.
  const sheetRow = headerRow + rowIndex;
  const data = Object.entries(changes).flatMap(([header, value]) => {
    const column = headers.indexOf(header);
    return column >= 0 ? [{ range: `'${sheetName.replace(/'/g, "''")}'!${columnLetter(column)}${sheetRow}`, values: [[asText(value)]] }] : [];
  });
  if (data.length) await sheets.spreadsheets.values.batchUpdate({ spreadsheetId: process.env.GOOGLE_SHEETS_ID, requestBody: { valueInputOption: "USER_ENTERED", data } });
  invalidateBootstrapCache();
  return { ok: true, source: "sheets" as const, id };
}

/** Find the numeric sheetId (gid) Google's batchUpdate API needs for a tab, by its name. */
async function getSheetGid(sheets: Awaited<ReturnType<typeof getSheets>>, sheetName: string): Promise<number> {
  // Cached index first; if the tab isn't in it (just created?), refresh once before giving up.
  const gid = (await sheetGids(sheets)).get(sheetName) ?? (await sheetGids(sheets, true)).get(sheetName);
  if (gid == null) throw new Error(`Sheet not found: ${sheetName}`);
  return gid;
}

/** Delete the row whose first column matches `id`. `headerRow` is where the header row lives (1-indexed). */
async function deleteRow(sheetName: string, headerRow: number, id: string) {
  if (await isDemoData()) return { ok: true, source: "demo" as const, id };
  const sheets = await getSheets();
  const values = (await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEETS_ID, range: `${sheetName}!A${headerRow}:Z` })).data.values as string[][] | undefined;
  const rowIndex = values?.findIndex((row, index) => index > 0 && row[0] === id) ?? -1;
  if (rowIndex < 0) throw new Error(`Row not found: ${id}`);
  const gid = await getSheetGid(sheets, sheetName);
  const absoluteRow0Indexed = headerRow - 1 + rowIndex;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    requestBody: { requests: [{ deleteDimension: { range: { sheetId: gid, dimension: "ROWS", startIndex: absoluteRow0Indexed, endIndex: absoluteRow0Indexed + 1 } } }] },
  });
  invalidateBootstrapCache();
  return { ok: true, source: "sheets" as const, id };
}

export function deleteWork(id: string) {
  return deleteRow(process.env.GOOGLE_WORK_SHEET ?? "WORK DESK — UPDATE", 5, id);
}

export function deleteControl(id: string) {
  return deleteRow(process.env.GOOGLE_CLOSE_SHEET ?? "WEEK CLOSE — UPDATE", 1, id);
}

/** Delete a row from any HQ_* sheet. `id` must match the value in the first column. */
export function deleteAnyRow(sheetName: string, id: string) {
  return deleteRow(sheetName, 1, id);
}

export function saveWork(update: SheetRow) {
  const fields: Record<string, string> = { status: "Status", waitingOn: "Waiting On", blocked: "Blocked?", result: "Result / Completion Note", evidence: "Evidence / Drive Link", plannedDay: "PLANNED DAY", why: "WHY / OUTCOME SUPPORTED" };
  const changes: Record<string, string> = {};
  Object.entries(fields).forEach(([key, header]) => { if (update[key] !== undefined) changes[header] = update[key]; });
  changes["Last Update"] = new Date().toISOString();
  if (update.status === "Done" || update.status === "Completed") changes["COMPLETED AT"] = new Date().toISOString();
  return updateRow(process.env.GOOGLE_WORK_SHEET ?? "WORK DESK — UPDATE", 5, "U", update.id, changes);
}

export function saveControl(update: SheetRow) {
  const fields: Record<string, string> = { status: "Status", evidence: "Evidence / Link", exception: "Exception?", notes: "Notes / Next Action" };
  const changes: Record<string, string> = {};
  Object.entries(fields).forEach(([key, header]) => { if (update[key] !== undefined) changes[header] = update[key]; });
  return updateRow(process.env.GOOGLE_CLOSE_SHEET ?? "WEEK CLOSE — UPDATE", 1, "J", update.id, changes);
}

/** Update any cell(s) in any HQ_* sheet. `id` must match the value in the first column. */
export function saveAnyRow(sheetName: string, id: string, changes: Record<string, string>) {
  return updateRow(sheetName, 1, "Z", id, changes);
}

// ── Dynamic custom sheets ───────────────────────────────────────────────
// Lets the app create new register tabs at runtime instead of needing a code
// change (a new field in HqBootstrap, a new whitelist entry, a new nav case)
// every time someone wants to track a new kind of record. HQ_CUSTOM_SHEETS
// is the single source of truth for which dynamic sheets exist.
const CUSTOM_SHEETS_REGISTRY = "HQ_CUSTOM_SHEETS";
const CUSTOM_SHEET_NAME_PATTERN = /^HQ_[A-Z0-9_]{2,40}$/;

export type CustomSheetDef = { name: string; label: string; columns: string[] };

async function ensureCustomSheetsRegistry(sheets: Awaited<ReturnType<typeof getSheets>>) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEETS_ID });
  if (meta.data.sheets?.some((s) => s.properties?.title === CUSTOM_SHEETS_REGISTRY)) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    requestBody: { requests: [{ addSheet: { properties: { title: CUSTOM_SHEETS_REGISTRY } } }] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: `${CUSTOM_SHEETS_REGISTRY}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [["Sheet Name", "Label", "Columns", "Created By", "Created At"]] },
  });
}

function customDefsFromRows(rows: SheetRow[]): CustomSheetDef[] {
  return rows
    .filter((r) => r["Sheet Name"])
    .map((r) => ({
      name: r["Sheet Name"],
      label: r.Label || r["Sheet Name"],
      columns: (r.Columns || "").split(",").map((c) => c.trim()).filter(Boolean),
    }));
}

export async function listCustomSheets(): Promise<CustomSheetDef[]> {
  if (await isDemoData()) return [];
  const rows = await readSheet(CUSTOM_SHEETS_REGISTRY, 1, "Z").catch(() => []);
  return customDefsFromRows(rows);
}

export async function isRegisteredCustomSheet(sheetName: string): Promise<boolean> {
  const defs = await listCustomSheets();
  return defs.some((d) => d.name === sheetName);
}

function slugifySheetName(label: string): string {
  const slug = label.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
  return `HQ_${slug || "CUSTOM"}`;
}

/**
 * Create a brand-new register tab from the app: pick a unique sheet name from
 * the label, create the tab, write the header row, and record it in the
 * registry so getBootstrap() and the write-whitelist both pick it up
 * immediately with no code change needed.
 */
export async function createCustomSheet(label: string, columns: string[], createdBy: string) {
  if (await isDemoData()) return { ok: false, error: "Not connected to Google Sheets yet." };
  const cleanLabel = label.trim();
  const cleanColumns = columns.map((c) => c.trim()).filter(Boolean);
  if (!cleanLabel) return { ok: false, error: "A name is required." };
  if (!cleanColumns.length) return { ok: false, error: "At least one column is required." };
  if (cleanColumns.length > 20) return { ok: false, error: "20 columns maximum." };

  const sheets = await getSheets();
  await ensureCustomSheetsRegistry(sheets);

  const meta = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEETS_ID });
  const existingTitles = new Set(meta.data.sheets?.map((s) => s.properties?.title).filter(Boolean));

  let name = slugifySheetName(cleanLabel);
  if (!CUSTOM_SHEET_NAME_PATTERN.test(name)) return { ok: false, error: "Could not derive a valid sheet name — try a name with letters or numbers in it." };
  let suffix = 2;
  while (existingTitles.has(name)) {
    name = `${slugifySheetName(cleanLabel)}_${suffix}`;
    suffix++;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    requestBody: { requests: [{ addSheet: { properties: { title: name } } }] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: `${name}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [cleanColumns] },
  });
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: `${CUSTOM_SHEETS_REGISTRY}!A:E`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[name, cleanLabel, cleanColumns.join(", "), createdBy, new Date().toISOString()]] },
  });

  sheetIndex = null; // a new tab now exists
  invalidateBootstrapCache();
  return { ok: true, source: "sheets" as const, name, label: cleanLabel, columns: cleanColumns };
}

/** Append a new row to any HQ_* sheet, mapping object keys to sheet headers. */
export async function appendAnyRow(sheetName: string, obj: Record<string, string>) {
  if (await isDemoData()) return { ok: true, source: "demo" as const };
  const sheets = await getSheets();
  const headResp = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEETS_ID, range: `${sheetName}!A1:Z1` });
  const headers = (headResp.data.values?.[0] ?? []) as string[];
  const row = headers.map(h => asText(obj[h] ?? ""));
  await sheets.spreadsheets.values.append({ spreadsheetId: process.env.GOOGLE_SHEETS_ID, range: `${sheetName}!A:Z`, valueInputOption: "USER_ENTERED", requestBody: { values: [row] } });
  invalidateBootstrapCache();
  return { ok: true, source: "sheets" as const };
}

const EMPTY: SheetRow[] = [];

export async function checkUserAccess(email: string): Promise<HqUser> {
  const defaultUser: HqUser = { email, name: email, role: "Unauthorized", area: "", canSeeAll: false, authorized: false };
  if (!email) return defaultUser;

  try {
    const accessRows = await readSheet("HQ_ACCESS", 1, "Z");
    const hit = accessRows.find(r =>
      String(r.Email || "").toLowerCase() === String(email).toLowerCase() &&
      !/^no$/i.test(r["Active?"] || "")
    );

    if (hit) {
      return {
        email,
        name: hit.Name || email,
        role: hit.Role || "Team Member",
        area: hit.Area || "My Work",
        canSeeAll: /yes/i.test(hit["Can See All?"] || ""),
        authorized: true,
      };
    }
  } catch (error) {
    console.error("Error reading HQ_ACCESS sheet:", error);
  }
  return defaultUser;
}


function accessAreas(user: HqUser) {
  return String(user.area || "")
    .split(/[;,|]/)
    .map(x => x.trim().toLowerCase())
    .filter(Boolean);
}

function filterBootstrapForUser(raw: HqBootstrap, user: HqUser): HqBootstrap {
  if (user.canSeeAll) return raw;
  const areas = accessAreas(user);
  const email = String(user.email || "").toLowerCase();
  const name = String(user.name || "").toLowerCase();

  const own = (x: SheetRow) =>
    String(x.Owner || x.owner || "").toLowerCase().includes(name) ||
    String(x.Owner || x.owner || "").toLowerCase().includes(email);

  const inArea = (x: SheetRow) => {
    const hay = [x.Business, x.Area, x["Business / Area"], x["Project / Function"]]
      .join(" ").toLowerCase();
    return (
      !areas.length ||
      areas.includes("my work") ||
      areas.some(a => hay.includes(a) || a.includes(hay))
    );
  };

  return {
    ...raw,
    work: raw.work.filter(x => own(x) || inArea(x)),
    checklistRuns: raw.checklistRuns.filter(x => own(x) || inArea(x)),
    checklistDefs: raw.checklistDefs.filter(inArea),
  };
}

// HqBootstrap fields that are a plain tab read (header in row 1, columns A:Z). Keeping the list
// in one place means the batched read and the assembled object can't drift apart.
const STANDARD_SHEETS: [keyof HqBootstrap, string][] = [
  ["targets", "HQ_TARGETS"], ["budgets", "HQ_BUDGETS"], ["customers", "HQ_CUSTOMERS"],
  ["customerIssues", "HQ_CUSTOMER_ISSUES"], ["customerFollowup", "HQ_CUSTOMER_FOLLOWUP"],
  ["reviews", "HQ_REVIEWS"],
  ["plans", "HQ_PLANS"], ["people", "HQ_PEOPLE"], ["ksi", "HQ_KSI"],
  ["gardeniaPipeline", "HQ_GARDENIA_PIPELINE"], ["gardeniaProduct", "HQ_GARDENIA_PRODUCT"], ["gardeniaTasks", "HQ_GARDENIA_TASKS"],
  ["checklistDefs", "HQ_CHECKLIST_DEFS"], ["checklistRuns", "HQ_CHECKLIST_RUNS"],
  ["alerts", "HQ_ALERTS"], ["property", "HQ_PROPERTY"], ["financeReg", "HQ_FINANCE_REGISTER"], ["personalReg", "HQ_PERSONAL_REGISTER"],
  ["requests", "HQ_REQUESTS"], ["training", "HQ_TRAINING"], ["systemAccess", "HQ_SYSTEM_ACCESS"], ["periods", "HQ_PERIODS"],
  ["notes", "HQ_NOTES"], ["activity", "HQ_ACTIVITY"],
  ["firefliesLegacy", "HQ_FIREFLIES_LEGACY"], ["ironTasks", "HQ_IRONMARK_TASKS"],
  ["edibleWeekly", "HQ_EDIBLE_WEEKLY"], ["edibleTargets", "HQ_EDIBLE_TARGETS"], ["edibleKsiReview", "HQ_EDIBLE_KSI_REVIEW"],
  ["financeItems", "HQ_FINANCE_ITEMS"], ["financePayments", "HQ_FINANCE_PAYMENTS"],
];

/** Reads the whole workspace from Google Sheets in a couple of requests (see readMany). */
async function fetchSnapshot(): Promise<HqBootstrap> {
  const workSheet = process.env.GOOGLE_WORK_SHEET ?? "WORK DESK — UPDATE";
  const closeSheet = process.env.GOOGLE_CLOSE_SHEET ?? "WEEK CLOSE — UPDATE";
  const results = await readMany([
    { name: workSheet, headerRow: 5, width: "U", required: true },
    { name: closeSheet, headerRow: 1, width: "J", required: true },
    ...STANDARD_SHEETS.map(([, name]) => ({ name, headerRow: 1, width: "Z" })),
    { name: CUSTOM_SHEETS_REGISTRY, headerRow: 1, width: "Z" },
  ]);
  const [work, controls] = results;
  const tabs = Object.fromEntries(STANDARD_SHEETS.map(([key], i) => [key, results[2 + i]]));
  const customSheetDefs = customDefsFromRows(results[2 + STANDARD_SHEETS.length]);

  // Dynamically-created sheets aren't known at compile time, so their data
  // lives in a lookup keyed by sheet name instead of a fixed HqBootstrap field.
  const customRows = customSheetDefs.length
    ? await readMany(customSheetDefs.map((d) => ({ name: d.name, headerRow: 1, width: "Z" })))
    : [];
  const customSheets: Record<string, SheetRow[]> = Object.fromEntries(customSheetDefs.map((d, i) => [d.name, customRows[i]]));

  return { work, controls, user: "", generatedAt: new Date().toISOString(), source: "sheets", ...tabs, customSheetDefs, customSheets } as unknown as HqBootstrap;
}

/**
 * The workspace snapshot: served from a 15s in-memory cache, with concurrent requests sharing one
 * read. If Google errors (e.g. the read quota), the last good snapshot is served for up to 10 minutes
 * instead of a broken page; its generatedAt still says how old it is.
 */
async function loadSnapshot(): Promise<HqBootstrap> {
  if (bootstrapCache && Date.now() - bootstrapCache.at < BOOTSTRAP_TTL_MS) return bootstrapCache.data;

  if (!bootstrapInFlight) {
    const generation = cacheGeneration;
    const promise: Promise<HqBootstrap> = fetchSnapshot()
      .then((data) => {
        // A write that landed mid-read makes this data possibly pre-write: return it, but don't cache it.
        if (generation === cacheGeneration) bootstrapCache = { at: Date.now(), data };
        return data;
      })
      .finally(() => {
        if (bootstrapInFlight === promise) bootstrapInFlight = null;
      });
    bootstrapInFlight = promise;
  }

  try {
    return await bootstrapInFlight;
  } catch (error) {
    if (bootstrapCache && Date.now() - bootstrapCache.at < BOOTSTRAP_STALE_OK_MS) {
      console.warn("Google Sheets read failed; serving the last good snapshot instead.", error);
      return bootstrapCache.data;
    }
    throw error;
  }
}

export async function getBootstrap(user: HqUser | null): Promise<HqBootstrap> {
  if (await isDemoData()) {
    return {
      work: demoWork, controls: demoControls,
      user: "Demo workspace", generatedAt: new Date().toISOString(), source: "demo",
      targets: EMPTY, budgets: EMPTY, customers: EMPTY, customerIssues: EMPTY,
      customerFollowup: EMPTY, reviews: EMPTY,
      plans: EMPTY, people: EMPTY, ksi: EMPTY, gardeniaPipeline: EMPTY,
      gardeniaProduct: EMPTY, gardeniaTasks: EMPTY, checklistDefs: EMPTY, checklistRuns: EMPTY,
      alerts: EMPTY, property: EMPTY, financeReg: EMPTY,
      personalReg: EMPTY, requests: EMPTY, training: EMPTY,
      systemAccess: EMPTY, periods: EMPTY, notes: EMPTY, activity: EMPTY,
      firefliesLegacy: EMPTY, ironTasks: EMPTY, customSheetDefs: [], customSheets: {},
      edibleWeekly: EMPTY, edibleTargets: EMPTY, edibleKsiReview: EMPTY,
      financeItems: EMPTY, financePayments: EMPTY,
    };
  }

  const snapshot = await loadSnapshot();
  const raw: HqBootstrap = { ...snapshot, user: user ? user.name : (process.env.GOOGLE_USER_EMAIL ?? "Sheets workspace") };
  return user ? filterBootstrapForUser(raw, user) : raw;
}

export async function generateExpectedRuns() {
  if (await isDemoData()) return { ok: false, source: "demo" };

  const s = (name: string) => readSheet(name, 1, "Z").catch(() => []);
  const [defs, runs, items] = await Promise.all([
    s("HQ_CHECKLIST_DEFS"),
    s("HQ_CHECKLIST_RUNS"),
    s("HQ_CHECKLIST_ITEMS"),
  ]);

  const activeDefs = defs.filter(x => !/no/i.test(x["Active?"] || ""));
  const now = new Date();
  const p = periodInfo(now);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  let newRowsCount = 0;
  for (const d of activeDefs) {
    let key = "";
    const type = String(d.Cadence || "").toUpperCase();
    if (type === "DAILY") key = today;
    else if (type === "WEEKLY") key = p.weekKey;
    else if (type === "MONTHLY") key = p.monthKey;
    else continue;

    if (runs.some(r => r["Checklist ID"] === d["Checklist ID"] && r["Period Key"] === key)) {
      continue;
    }

    const relItems = items.filter(i => i["Checklist ID"] === d["Checklist ID"]);
    const requiredCount = relItems.filter(i => /yes/i.test(i["Required?"] || "")).length;

    await appendAnyRow("HQ_CHECKLIST_RUNS", {
      "Run ID": `${d["Checklist ID"]}-${key}`,
      "Checklist ID": d["Checklist ID"] || "",
      "Business": d.Business || "",
      "Area": d.Area || "",
      "Checklist Name": d["Checklist Name"] || "",
      "Period Key": key,
      "Period Type": type,
      "Scheduled Date": today,
      "Owner": d["Owner Role"] || "",
      "Status": "Not Started",
      "Required Items": String(requiredCount),
      "Completed Items": "0",
      "Completion %": "0",
      "On Time?": "",
      "Exceptions": "0",
      "Evidence Complete?": "No",
      "Started At": "",
      "Completed At": "",
      "Last Update": new Date().toISOString(),
    });

    newRowsCount++;
  }

  return { ok: true, generatedCount: newRowsCount };
}

