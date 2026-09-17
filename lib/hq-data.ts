import { google } from "googleapis";
import type { HqBootstrap, SheetRow, HqUser } from "./hq-types";
import { getOAuthClient, getValidClient } from "./hq-auth";
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
  const rows = await readSheet(sheetName, 5, "U").catch(() => []);
  const highest = rows.reduce((max, row) => {
    const match = /^W-(\d+)$/.exec(row.ID || "");
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `W-${String(highest + 1).padStart(3, "0")}`;
}

export async function addWork(item: SheetRow) {
  if (await isDemoData()) return { ok: true, source: "demo" as const, id: `W-${Date.now()}` };
  const id = await nextWorkId();
  await (await getSheets()).spreadsheets.values.append({ spreadsheetId: process.env.GOOGLE_SHEETS_ID, range: `${process.env.GOOGLE_WORK_SHEET ?? "WORK DESK — UPDATE"}!A:U`, valueInputOption: "USER_ENTERED", requestBody: { values: [[id, item["Project / Function"], item["Work Item / Next Action"], item.Owner, "Action", "PUSH", "No", "Yes", item["Due Date"], "Open", "", "No", "", "", new Date().toISOString(), new Date().toISOString(), "No", "", "", "", "0d"]] } });
  return { ok: true, source: "sheets" as const, id };
}

async function updateRow(sheetName: string, headerRow: number, width: string, id: string, changes: Record<string, string>) {
  if (await isDemoData()) return { ok: true, source: "demo" as const, id };
  const sheets = await getSheets();
  const values = (await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEETS_ID, range: `${sheetName}!A${headerRow}:${width}` })).data.values as string[][] | undefined;
  const headers = values?.[0] ?? [];
  const rowIndex = values?.findIndex((row, index) => index > 0 && row[0] === id) ?? -1;
  if (rowIndex < 0) throw new Error(`Row not found: ${id}`);
  const row = [...(values?.[rowIndex] ?? [])];
  Object.entries(changes).forEach(([header, value]) => { const column = headers.indexOf(header); if (column >= 0) row[column] = value; });
  await sheets.spreadsheets.values.update({ spreadsheetId: process.env.GOOGLE_SHEETS_ID, range: `${sheetName}!A${headerRow + rowIndex}:${width}${headerRow + rowIndex}`, valueInputOption: "USER_ENTERED", requestBody: { values: [row] } });
  return { ok: true, source: "sheets" as const, id };
}

/** Find the numeric sheetId (gid) Google's batchUpdate API needs for a tab, by its name. */
async function getSheetGid(sheets: Awaited<ReturnType<typeof getSheets>>, sheetName: string): Promise<number> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEETS_ID });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === sheetName);
  if (sheet?.properties?.sheetId == null) throw new Error(`Sheet not found: ${sheetName}`);
  return sheet.properties.sheetId;
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

export async function listCustomSheets(): Promise<CustomSheetDef[]> {
  if (await isDemoData()) return [];
  const rows = await readSheet(CUSTOM_SHEETS_REGISTRY, 1, "Z").catch(() => []);
  return rows
    .filter((r) => r["Sheet Name"])
    .map((r) => ({
      name: r["Sheet Name"],
      label: r.Label || r["Sheet Name"],
      columns: (r.Columns || "").split(",").map((c) => c.trim()).filter(Boolean),
    }));
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

  return { ok: true, source: "sheets" as const, name, label: cleanLabel, columns: cleanColumns };
}

/** Append a new row to any HQ_* sheet, mapping object keys to sheet headers. */
export async function appendAnyRow(sheetName: string, obj: Record<string, string>) {
  if (await isDemoData()) return { ok: true, source: "demo" as const };
  const sheets = await getSheets();
  const headResp = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEETS_ID, range: `${sheetName}!A1:Z1` });
  const headers = (headResp.data.values?.[0] ?? []) as string[];
  const row = headers.map(h => obj[h] ?? "");
  await sheets.spreadsheets.values.append({ spreadsheetId: process.env.GOOGLE_SHEETS_ID, range: `${sheetName}!A:Z`, valueInputOption: "USER_ENTERED", requestBody: { values: [row] } });
  return { ok: true, source: "sheets" as const };
}

// Update row based on matching a specific column index (0-based)
export async function updateRowByColumn(sheetName: string, idHeaderRow: number, lastCol: string, matchColIndex: number, matchValue: string, updates: Record<string, string>) {
  if (await isDemoData()) return { ok: true, source: "demo" as const };
  const sheets = await getSheets();
  const raw = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEETS_ID, range: `${sheetName}!A1:${lastCol}` });
  const rows = raw.data.values ?? [];
  if (!rows || rows.length < idHeaderRow) throw new Error("Header not found");

  const headers = rows[idHeaderRow - 1] as string[];
  const rowIndex = rows.findIndex((r, idx) => idx >= idHeaderRow && String(r[matchColIndex] || "") === matchValue);
  if (rowIndex === -1) return { ok: false, error: "Row not found" };

  const targetRow = rows[rowIndex];
  const newRow = [...targetRow];

  for (const [key, val] of Object.entries(updates)) {
    const colIndex = headers.indexOf(key);
    if (colIndex > -1) {
      newRow[colIndex] = val;
    }
  }

  const range = `${sheetName}!A${rowIndex + 1}:${lastCol}${rowIndex + 1}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID, range, valueInputOption: "USER_ENTERED", requestBody: { values: [newRow] }
  });

  return { ok: true, source: "sheets" as const, row: newRow };
}

export async function recalcChecklistRun(runId: string) {
  if (await isDemoData()) return;
  const s = (name: string) => readSheet(name, 1, "Z").catch(() => []);
  const [runs, notes, items] = await Promise.all([
    s("HQ_CHECKLIST_RUNS"),
    s("HQ_NOTES"),
    s("HQ_CHECKLIST_ITEMS"),
  ]);

  const runIndex = runs.findIndex(r => r["Run ID"] === runId);
  if (runIndex === -1) return;
  const run = runs[runIndex];

  const relevantNotes = notes.filter(n => n["Source Type"] === "Checklist Item" && String(n["Source ID"] || "").startsWith(runId + "|"));
  const relevantItems = items.filter(i => i["Checklist ID"] === run["Checklist ID"]);
  const requiredCount = relevantItems.filter(i => /yes/i.test(i["Required?"] || "")).length;

  let exceptions = 0;
  let completedItems = 0;

  relevantNotes.forEach(n => {
    try {
      const state = JSON.parse(n.Note);
      if (state.status === "Complete") completedItems++;
      if (state.status === "Exception") exceptions++;
    } catch (e) { }
  });

  const completionPct = requiredCount > 0 ? (completedItems / requiredCount) : (completedItems > 0 ? 1 : 0);
  const status = completionPct >= 1 ? "Complete" : (completedItems > 0 ? "In Progress" : "Not Started");

  await saveAnyRow("HQ_CHECKLIST_RUNS", runId, {
    "Completed Items": String(completedItems),
    "Completion %": String(completionPct),
    "Exceptions": String(exceptions),
    "Status": status,
    "Last Update": new Date().toISOString(),
  });
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

export async function getBootstrap(user: HqUser | null): Promise<HqBootstrap> {
  if (await isDemoData()) {
    return {
      work: demoWork, controls: demoControls,
      user: "Demo workspace", generatedAt: new Date().toISOString(), source: "demo",
      targets: EMPTY, budgets: EMPTY, customers: EMPTY, customerIssues: EMPTY,
      customerFollowup: EMPTY, reviews: EMPTY, decisions: EMPTY, exceptions: EMPTY,
      plans: EMPTY, people: EMPTY, ksi: EMPTY, gardeniaPipeline: EMPTY,
      gardeniaProduct: EMPTY, gardeniaTasks: EMPTY, checklistDefs: EMPTY, checklistRuns: EMPTY,
      legacy: EMPTY, alerts: EMPTY, property: EMPTY, financeReg: EMPTY,
      podcast: EMPTY, personalReg: EMPTY, requests: EMPTY, training: EMPTY,
      systemAccess: EMPTY, periods: EMPTY, notes: EMPTY, activity: EMPTY,
      firefliesLegacy: EMPTY, ironTasks: EMPTY, customSheetDefs: [], customSheets: {},
    };
  }

  const s = (name: string) => readSheet(name, 1, "Z").catch(() => EMPTY);
  const [
    work, controls,
    targets, budgets, customers, customerIssues, customerFollowup,
    reviews, decisions, exceptions, plans, people, ksi,
    gardeniaPipeline, gardeniaProduct, gardeniaTasks, checklistDefs, checklistRuns,
    legacy, alerts, property, financeReg, podcast, personalReg,
    requests, training, systemAccess, periods, notes, activity,
    firefliesLegacy, ironTasks, customSheetDefs,
  ] = await Promise.all([
    readSheet(process.env.GOOGLE_WORK_SHEET ?? "WORK DESK — UPDATE", 5, "U"),
    readSheet(process.env.GOOGLE_CLOSE_SHEET ?? "WEEK CLOSE — UPDATE", 1, "J"),
    s("HQ_TARGETS"), s("HQ_BUDGETS"), s("HQ_CUSTOMERS"),
    s("HQ_CUSTOMER_ISSUES"), s("HQ_CUSTOMER_FOLLOWUP"),
    s("HQ_REVIEWS"), s("HQ_DECISIONS"), s("HQ_EXCEPTIONS"),
    s("HQ_PLANS"), s("HQ_PEOPLE"), s("HQ_KSI"),
    s("HQ_GARDENIA_PIPELINE"), s("HQ_GARDENIA_PRODUCT"), s("HQ_GARDENIA_TASKS"),
    s("HQ_CHECKLIST_DEFS"), s("HQ_CHECKLIST_RUNS"),
    s("HQ_LEGACY_CLOSEOUT"), s("HQ_ALERTS"),
    s("HQ_PROPERTY"), s("HQ_FINANCE_REGISTER"),
    s("HQ_PODCAST"), s("HQ_PERSONAL_REGISTER"),
    s("HQ_REQUESTS"), s("HQ_TRAINING"),
    s("HQ_SYSTEM_ACCESS"), s("HQ_PERIODS"),
    s("HQ_NOTES"), s("HQ_ACTIVITY"),
    s("HQ_FIREFLIES_LEGACY"), s("HQ_IRONMARK_TASKS"), listCustomSheets().catch(() => []),
  ]);

  // Dynamically-created sheets aren't known at compile time, so their data
  // lives in a lookup keyed by sheet name instead of a fixed HqBootstrap field.
  const customSheets: Record<string, SheetRow[]> = {};
  await Promise.all(customSheetDefs.map(async (def) => {
    customSheets[def.name] = await readSheet(def.name, 1, "Z").catch(() => EMPTY);
  }));

  const raw: HqBootstrap = {
    work, controls,
    user: user ? user.name : (process.env.GOOGLE_USER_EMAIL ?? "Sheets workspace"),
    generatedAt: new Date().toISOString(), source: "sheets",
    targets, budgets, customers, customerIssues, customerFollowup,
    reviews, decisions, exceptions, plans, people, ksi,
    gardeniaPipeline, gardeniaProduct, gardeniaTasks, checklistDefs, checklistRuns,
    legacy, alerts, property, financeReg, podcast, personalReg,
    requests, training, systemAccess, periods, notes, activity,
    firefliesLegacy, ironTasks, customSheetDefs, customSheets,
  };

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

