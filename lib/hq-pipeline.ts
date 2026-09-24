import type { SheetRow } from "./hq-types";
import { isoWeekKeyUTC } from "./hq-scorecard";

// The maths and rules behind Gardenia's Fire sales pipeline (HQ_GARDENIA_PIPELINE). Pure functions only, so the
// screens in app/gardenia.tsx stay thin and every rule here can be tested against the real sheet's rows.

export const PIPELINE_SHEET = "HQ_GARDENIA_PIPELINE";
export const PIPELINE_AREA = "Gardenia's Fire";

// ── Stages ───────────────────────────────────────────────────────────────────

export type StageDef = { id: string; label: string; test?: RegExp };

/** In sales order. A stage that matches nothing falls into the first, the same rule the boards use. */
export const SALES_STAGE_DEFS: StageDef[] = [
  { id: "toResearch", label: "To Research" },
  { id: "priority", label: "Priority", test: /priority/ },
  { id: "attempted", label: "Attempted", test: /attempt/ },
  { id: "qualified", label: "Qualified", test: /qualif/ },
  { id: "tastingScheduled", label: "Tasting Scheduled", test: /tasting sched/ },
  { id: "tastingCompleted", label: "Tasting Completed", test: /tasting comp/ },
  { id: "firstOrderWon", label: "First Order Won", test: /first order/ },
  { id: "recurringWon", label: "Recurring Won", test: /recurring/ },
];

export const STAGE = { qualified: 3, tastingScheduled: 4, recurringWon: 7 } as const;

export const STAGE_HINTS: Record<string, string> = {
  toResearch: "We know the name; still finding the decision-maker.",
  priority: "Chosen as a target to approach next.",
  attempted: "We have tried to reach them (call, visit or email).",
  qualified: "We have spoken and they look like a fit.",
  tastingScheduled: "A tasting or sample is booked.",
  tastingCompleted: "They have tasted; waiting on a decision.",
  firstOrderWon: "They placed a first order.",
  recurringWon: "A standing account that reorders regularly.",
};

export function stageIndex(stage: string | undefined): number {
  const s = (stage || "").toLowerCase();
  const at = SALES_STAGE_DEFS.findIndex(d => d.test?.test(s));
  return at >= 0 ? at : 0;
}

export const stageLabels = () => SALES_STAGE_DEFS.map(s => s.label);

/** The stage choices for an account: the standard ones, plus its current value when that isn't one of them (so nothing is silently overwritten). */
export function stageChoices(current: string): string[] {
  const labels = stageLabels();
  return current && !labels.some(l => l.toLowerCase() === current.toLowerCase()) ? [current, ...labels] : labels;
}

// ── Columns: found by name, so a column the client adds or renames still shows up ─────────────────────────────

export type Role = "stage" | "contact" | "phone" | "email" | "lastContact" | "nextFollowUp" | "tasting" | "cadence" | "value" | "risk" | "owner" | "source" | "notes";
export type Roles = Partial<Record<Role, string>>;

export const DEFAULT_HEADERS = [
  "Account / Prospect", "Stage", "Contact / Company", "Last Contact", "Next Follow-up", "Tasting / Sample",
  "Standing Cadence", "Revenue / Value", "Risk", "Owner", "Source / Evidence", "Notes", "Phone", "Email",
];

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// Order matters: "Contact Phone" is a phone, not the contact's name, so phone and email are tried before "contact".
const ROLE_TESTS: [Role, RegExp][] = [
  ["stage", /^stage$/],
  ["lastContact", /^last (contact|touch)/],
  ["nextFollowUp", /^next follow/],
  ["phone", /phone|mobile|cell|^tel\b/],
  ["email", /e ?mail/],
  ["contact", /^contact/],
  ["tasting", /tasting|sample/],
  ["cadence", /cadence/],
  ["value", /^(revenue|value|offer)/],
  ["risk", /^risk/],
  ["owner", /^owner/],
  ["source", /^(source|evidence)/],
  ["notes", /^notes?$/],
];

/** Which header plays which part. The first column is always the account's name (the sheet's row key). */
export function columnRoles(headers: string[]): Roles {
  const roles: Roles = {};
  headers.slice(1).forEach(h => {
    const n = norm(h);
    const hit = ROLE_TESTS.find(([role, re]) => !roles[role] && re.test(n));
    if (hit) roles[hit[0]] = h;
  });
  return roles;
}

/** Headers come from the rows themselves; with no rows yet, the standard twelve. */
export function pipelineColumns(rows: SheetRow[]): { headers: string[]; roles: Roles } {
  const headers = rows.length ? Object.keys(rows[0]) : DEFAULT_HEADERS;
  return { headers, roles: columnRoles(headers) };
}

export type FieldGroup = { title: string; headers: string[] };

export function fieldGroups(headers: string[], roles: Roles): FieldGroup[] {
  const pick = (parts: (Role | "name")[]) => parts.map(p => (p === "name" ? headers[0] : roles[p])).filter((h): h is string => Boolean(h));
  const groups: FieldGroup[] = [
    { title: "Who", headers: pick(["name", "contact", "phone", "email", "owner"]) },
    { title: "Where it stands", headers: pick(["stage", "risk"]) },
    { title: "Follow-up", headers: pick(["lastContact", "nextFollowUp", "cadence"]) },
    { title: "Offer", headers: pick(["tasting", "value"]) },
    { title: "Evidence and notes", headers: pick(["source", "notes"]) },
  ];
  const used = new Set(groups.flatMap(g => g.headers));
  const rest = headers.filter(h => !used.has(h));
  if (rest.length) groups.push({ title: "More details", headers: rest });
  return groups.filter(g => g.headers.length);
}

const FIELD_HINTS: Record<Role | "name", string> = {
  name: "The company (or person) we are approaching.",
  contact: "Who we deal with there, and their role.",
  phone: "The best number to reach them on. Tap it on a phone to call.",
  email: "Where to write to them. Tap it to start an email.",
  owner: "Who on our side is responsible for this account.",
  stage: "Where they are in the sales steps.",
  risk: "Anything that could stop this deal.",
  lastContact: "The last time we spoke, visited or wrote.",
  nextFollowUp: "What happens next, and when.",
  cadence: "How often they would order once they are regular (for example weekly).",
  tasting: "Whether they have had a tasting or sample, and when.",
  value: "The offer we are pitching, or what the account is worth.",
  source: "Where we found them, or a link that proves what happened.",
  notes: "Anything worth remembering. Each logged touch adds a dated line here.",
};

export function fieldHint(header: string, headers: string[], roles: Roles): string {
  if (header === headers[0]) return FIELD_HINTS.name;
  const role = (Object.keys(roles) as Role[]).find(r => roles[r] === header);
  return role ? FIELD_HINTS[role] : "";
}

/** A tap-to-call or tap-to-email link for a phone / email cell, or null when the cell is not one (free text stays plain text). */
export function contactLink(kind: "phone" | "email", value: string | undefined | null): string | null {
  const v = String(value ?? "").trim();
  if (kind === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? `mailto:${v}` : null;
  const digits = v.replace(/\D/g, "");
  return /^[\d\s()+.\-x]+$/i.test(v) && digits.length >= 7 && digits.length <= 15 ? `tel:${v.startsWith("+") ? "+" : ""}${digits}` : null;
}

// ── Dates: read strictly. A free-text cell such as "Follow up on friday" has no date, and we never guess one ────

const DAY = 86400000;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_RE = MONTHS.join("|");

const utc = (y: number, m: number, d: number): Date | null => {
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? t : null;
};

/** The first complete date (with a year) found in a piece of text, as UTC midnight, plus the text that spelled it. */
export function findDate(text: string | undefined | null): { date: Date; token: string } | null {
  const s = String(text ?? "");
  const monthNo = (name: string) => MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1;
  const tries: [RegExp, (m: RegExpExecArray) => Date | null][] = [
    [/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, m => utc(+m[1], +m[2], +m[3])],
    [/\b(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})\b/, m => utc(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[1], +m[2])],
    [new RegExp(`\\b(${MONTH_RE})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "i"), m => utc(+m[3], monthNo(m[1]), +m[2])],
    [new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_RE})[a-z]*\\.?,?\\s+(\\d{4})\\b`, "i"), m => utc(+m[3], monthNo(m[2]), +m[1])],
  ];
  for (const [re, make] of tries) {
    const m = re.exec(s);
    const date = m ? make(m) : null;
    if (m && date) return { date, token: m[0] };
  }
  const serial = /^\d{5}(\.\d+)?$/.exec(s.trim());
  if (serial) {
    const n = parseFloat(s);
    if (n > 30000 && n < 70000) return { date: new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * DAY), token: s.trim() };
  }
  return null;
}

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
/** Today's calendar date (in the viewer's time zone) as UTC midnight, so it compares cleanly with sheet dates. */
export const todayUTC = (now: number | Date) => {
  const d = new Date(now);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};
export const daysBetween = (later: Date, earlier: Date) => Math.round((later.getTime() - earlier.getTime()) / DAY);
export const dayLabel = (d: Date, withYear = true) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" });

export type FollowUp = { text: string; date: Date | null; action: string };

/** "2026-09-30 · Call Anderson" -> date 2026-09-30, action "Call Anderson". Older free text keeps its wording and has no date. */
export function parseFollowUp(text: string | undefined | null): FollowUp {
  const t = String(text ?? "").trim();
  const found = findDate(t);
  if (!found) return { text: t, date: null, action: t };
  const action = t
    .replace(found.token, "")
    .replace(/\(\s*\)|\[\s*\]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s·:—–|,-]+|[\s·:—–|,-]+$/g, "")
    .trim();
  return { text: t, date: found.date, action };
}

/** The other way round: what gets stored in the sheet's follow-up cell. */
export function composeFollowUp(iso: string, action: string): string {
  const a = action.trim();
  return iso && a ? `${iso} · ${a}` : iso || a;
}

export function quickDates(today: Date): { label: string; iso: string }[] {
  return [
    { label: "Tomorrow", iso: isoDay(addDays(today, 1)) },
    { label: "In 3 days", iso: isoDay(addDays(today, 3)) },
    { label: "Next week", iso: isoDay(addDays(today, 7)) },
    { label: "In 2 weeks", iso: isoDay(addDays(today, 14)) },
  ];
}

// ── Accounts ─────────────────────────────────────────────────────────────────

const EMPTY_WORDS = /^(no|none|n\/a|na|nil|not yet|tbd|-|–|—)$/i;
/** True for an empty cell, or one that says "none" / "n/a" / "not yet". */
export const isBlank = (v: string | undefined | null) => {
  const s = String(v ?? "").trim();
  return !s || EMPTY_WORDS.test(s);
};

export type Account = {
  /** The row's first-column value exactly as the sheet holds it: what edit and delete find the row by. */
  key: string;
  row: SheetRow;
  name: string;
  stage: string;
  stageIdx: number;
  owner: string;
  contact: string;
  value: string;
  risk: string;
  notes: string;
  source: string;
  tasting: string;
  cadence: string;
  lastContact: Date | null;
  lastContactText: string;
  followUp: FollowUp;
};

export function accountsFrom(rows: SheetRow[], headers: string[], roles: Roles): Account[] {
  const text = (row: SheetRow, role: Role) => (roles[role] ? (row[roles[role] as string] ?? "").trim() : "");
  return rows.map(row => {
    const key = row[headers[0]] ?? "";
    const lastContactText = text(row, "lastContact");
    return {
      key, row, name: key.trim(),
      stage: text(row, "stage"), stageIdx: stageIndex(text(row, "stage")),
      owner: text(row, "owner"), contact: text(row, "contact"), value: text(row, "value"), risk: text(row, "risk"),
      notes: text(row, "notes"), source: text(row, "source"), tasting: text(row, "tasting"), cadence: text(row, "cadence"),
      lastContact: findDate(lastContactText)?.date ?? null, lastContactText,
      followUp: parseFollowUp(text(row, "nextFollowUp")),
    };
  }).filter(a => a.name);
}

export type FollowState = "overdue" | "today" | "week" | "later" | "nodate";

export function followState(a: Account, today: Date): { state: FollowState; days: number | null } {
  const d = a.followUp.date;
  if (!d) return { state: "nodate", days: null };
  const days = daysBetween(d, today);
  return { state: days < 0 ? "overdue" : days === 0 ? "today" : days <= 7 ? "week" : "later", days };
}

export const daysSinceContact = (a: Account, today: Date): number | null => (a.lastContact ? daysBetween(today, a.lastContact) : null);

/** Past the research stage with no contact logged, or none for two weeks. */
export function needsTouch(a: Account, today: Date, days = 14): boolean {
  if (a.stageIdx < 1) return false;
  const since = daysSinceContact(a, today);
  return since === null || since > days;
}

export const FOLLOW_GROUPS: { state: FollowState; title: string; hint: string }[] = [
  { state: "overdue", title: "Overdue", hint: "The follow-up date has passed." },
  { state: "today", title: "Today", hint: "" },
  { state: "week", title: "This week", hint: "Due in the next 7 days." },
  { state: "later", title: "Later", hint: "" },
  { state: "nodate", title: "No date set", hint: "These will not remind anyone. Log a touch, or edit the account, to set a follow-up date." },
];

const byName = (a: Account, b: Account) => a.name.localeCompare(b.name);

export function followGroups(accounts: Account[], today: Date): Record<FollowState, Account[]> {
  const out: Record<FollowState, Account[]> = { overdue: [], today: [], week: [], later: [], nodate: [] };
  for (const a of accounts) out[followState(a, today).state].push(a);
  const byDate = (a: Account, b: Account) =>
    (a.followUp.date?.getTime() ?? 0) - (b.followUp.date?.getTime() ?? 0) || b.stageIdx - a.stageIdx || byName(a, b);
  for (const s of ["overdue", "today", "week", "later"] as const) out[s].sort(byDate);
  out.nodate.sort((a, b) => b.stageIdx - a.stageIdx || byName(a, b));
  return out;
}

export function matchesSearch(a: Account, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = Object.values(a.row).join(" ").toLowerCase();
  return words.every(w => hay.includes(w));
}

export const nameKey = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
export function duplicateOf(accounts: Account[], name: string, exceptKey?: string): Account | null {
  const k = nameKey(name);
  return accounts.find(a => a.key !== exceptKey && nameKey(a.name) === k) ?? null;
}

/** "My accounts": the owner cell mentions the signed-in person's first name. */
export function isMine(a: Account, me: string): boolean {
  const first = me.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return first.length >= 2 && a.owner.toLowerCase().includes(first);
}

// ── The client's own headline numbers ────────────────────────────────────────

export type PipelineNumbers = { prospects: number; contacts: number; tastings: number; standing: number };

/** Names (lower-cased) with a logged touch where we actually reached someone. */
export function reachedNames(activity: SheetRow[]): Set<string> {
  const out = new Set<string>();
  for (const r of activity) {
    if (r["Action Type"] === ACTION.touch && r["Source Type"] === PIPELINE_SHEET && /· Reached$/.test(r["New Value"] || "")) out.add(nameKey(r["Source ID"] || ""));
  }
  return out;
}

export function pipelineNumbers(accounts: Account[], reached: Set<string>): PipelineNumbers {
  let contacts = 0, tastings = 0, standing = 0;
  for (const a of accounts) {
    if (a.stageIdx >= STAGE.qualified || reached.has(nameKey(a.name))) contacts++;
    if (a.stageIdx >= STAGE.tastingScheduled || !isBlank(a.tasting)) tastings++;
    if (a.stageIdx >= STAGE.recurringWon || !isBlank(a.cadence)) standing++;
  }
  return { prospects: accounts.length, contacts, tastings, standing };
}

export const NUMBER_HELP = {
  prospects: { label: "Prospects Identified", how: "Every account in the pipeline." },
  contacts: { label: "Contacts Made", how: "Accounts we have reached and confirmed as a fit (Qualified or further along), plus any account where a logged call reached someone." },
  tastings: { label: "Tastings", how: "Accounts with a tasting booked or done: Tasting Scheduled or further along, or something written in the Tasting / Sample column." },
  standing: { label: "Standing Accounts", how: "Accounts that reorder: Recurring Won, or a Standing Cadence written in." },
  revenue: { label: "Weekly Revenue", how: "Comes from orders (Shopify and the books), not from the pipeline, so it shows “Not reported” until that is connected." },
} as const;

// ── History: stage moves and touches are written to the activity log so the closing and Home can use them ─────

export const ACTION = { move: "Stage Moved", touch: "Touch Logged", add: "Account Added" } as const;
export type ActionKey = keyof typeof ACTION;

export function activityRow(i: { user: string; type: ActionKey; name: string; from?: string; to?: string; detail: string; now: Date }): Record<string, string> {
  return {
    Timestamp: i.now.toISOString(),
    User: i.user,
    "Action Type": ACTION[i.type],
    "Business / Area": PIPELINE_AREA,
    "Source Type": PIPELINE_SHEET,
    "Source ID": i.name,
    "Old Value": i.from ?? "",
    "New Value": i.to ?? "",
    Detail: i.detail,
  };
}

export type PipelineEvent = { at: Date; type: ActionKey; name: string; from: string; to: string; user: string; detail: string };
const TYPE_OF: Record<string, ActionKey> = { [ACTION.move]: "move", [ACTION.touch]: "touch", [ACTION.add]: "add" };

/** The pipeline's entries from the activity log, newest first. */
export function pipelineEvents(activity: SheetRow[]): PipelineEvent[] {
  const out: PipelineEvent[] = [];
  for (const r of activity) {
    const type = TYPE_OF[r["Action Type"] || ""];
    const at = new Date(r.Timestamp || "");
    if (!type || r["Source Type"] !== PIPELINE_SHEET || Number.isNaN(at.getTime())) continue;
    out.push({ at, type, name: r["Source ID"] || "", from: r["Old Value"] || "", to: r["New Value"] || "", user: r.User || "", detail: r.Detail || "" });
  }
  return out.sort((a, b) => b.at.getTime() - a.at.getTime());
}

export const touchKinds = ["Call", "Visit", "Email", "Text", "Sample / tasting", "Other"] as const;

/** A touch as a logged activity row, and its dated line for the Notes cell (newest line first). */
export function touchLine(i: { iso: string; who: string; kind: string; reached: boolean; text: string }): string {
  const text = i.text.replace(/\s*\n\s*/g, " ").trim();
  return `${i.iso} · ${i.who || "Someone"} · ${i.kind} (${i.reached ? "reached" : "no answer"})${text ? `: ${text}` : ""}`;
}
export const addNoteLine = (existing: string, line: string) => [line, existing.trim()].filter(Boolean).join("\n");

/** A sensible stage to offer after a touch; nothing moves unless the person leaves it selected. */
export function suggestStage(currentIdx: number, reached: boolean): number {
  if (!reached && currentIdx < 2) return 2;
  return currentIdx;
}

// ── A week's movement ────────────────────────────────────────────────────────

export type WeekSpan = { start: Date; end: Date; key: string; label: string };

/** Monday to Sunday (viewer's time zone) `offset` weeks from the one containing `now`. */
export function weekSpan(now: Date, offset = 0): WeekSpan {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) + 7 * offset);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
  const short = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return {
    start, end,
    key: isoWeekKeyUTC(new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()))),
    label: `${short(start)} – ${short(last)}, ${last.getFullYear()}`,
  };
}

export type WeekSummary = { touches: PipelineEvent[]; reached: number; accountsTouched: number; advanced: PipelineEvent[]; added: PipelineEvent[] };

export function weekSummary(events: PipelineEvent[], span: WeekSpan): WeekSummary {
  const inWeek = events.filter(e => e.at >= span.start && e.at < span.end);
  const touches = inWeek.filter(e => e.type === "touch");
  return {
    touches,
    reached: touches.filter(e => /· Reached$/.test(e.to)).length,
    accountsTouched: new Set(touches.map(e => nameKey(e.name))).size,
    advanced: inWeek.filter(e => e.type === "move" && stageIndex(e.to) > stageIndex(e.from)),
    added: inWeek.filter(e => e.type === "add"),
  };
}

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const bullets = (lines: string[], cap = 6) =>
  [...lines.slice(0, cap).map(l => `• ${l}`), ...(lines.length > cap ? [`• …and ${lines.length - cap} more`] : [])].join("\n");

export function numbersLine(nums: PipelineNumbers, s: WeekSummary, span: WeekSpan): string {
  return `Pipeline for ${span.label}: ${plural(nums.prospects, "prospect")} · ${plural(nums.contacts, "contact")} made · ${plural(nums.tastings, "tasting")} · ${plural(nums.standing, "standing account")} · ${plural(s.touches.length, "touch", "touches")} logged (${plural(s.accountsTouched, "account")}) · ${s.advanced.length} moved forward.`;
}

/** A first draft of the four wrap-up boxes from what the pipeline actually did this week. */
export function weekWrapUp(i: { accounts: Account[]; summary: WeekSummary; today: Date; openTasks: SheetRow[] }): { wins: string; misses: string; blockers: string; next: string } {
  const { accounts, summary, today } = i;
  const wins: string[] = summary.advanced.map(e => `${e.name} moved to ${e.to}`);
  if (summary.added.length) wins.push(`${plural(summary.added.length, "new account")} added: ${summary.added.map(e => e.name).join(", ")}`);
  if (summary.touches.length) wins.push(`${plural(summary.touches.length, "touch", "touches")} logged across ${plural(summary.accountsTouched, "account")} (${summary.reached} reached someone)`);

  const groups = followGroups(accounts, today);
  const misses = groups.overdue.map(a => {
    const late = -(followState(a, today).days ?? 0);
    return `${a.name}: follow-up was due ${dayLabel(a.followUp.date as Date, false)} (${plural(late, "day")} ago)${a.followUp.action ? `, ${a.followUp.action}` : ""}`;
  });
  const overdueKeys = new Set(groups.overdue.map(a => a.key));
  for (const a of accounts.filter(x => !overdueKeys.has(x.key) && needsTouch(x, today))) {
    const since = daysSinceContact(a, today);
    misses.push(`${a.name}: ${since === null ? "no contact logged yet" : `no contact for ${plural(since, "day")}`}`);
  }

  const blockers = accounts.filter(a => !isBlank(a.risk)).map(a => `${a.name}: ${a.risk}`);
  const next = [
    ...[...groups.today, ...groups.week].map(a => `${a.name} · ${dayLabel(a.followUp.date as Date, false)}${a.followUp.action ? `: ${a.followUp.action}` : ""}`),
    ...i.openTasks.map(t => `Task: ${t.Task}${t.Owner ? ` (${t.Owner}${t.Due ? `, due ${t.Due}` : ""})` : ""}`),
  ];
  return { wins: bullets(wins), misses: bullets(misses), blockers: bullets(blockers), next: bullets(next) };
}

// ── Tasks tied to an account: found again by a tag in the task's Notes cell ─────────────────────────────────

export const accountTag = (name: string) => `Account: ${name}`;

export function taskAccount(task: SheetRow): string {
  const m = /^Account:\s*(.+?)(?:\s+—\s+|\s*\|\s*|\n|$)/i.exec((task.Notes || "").trim());
  return m ? m[1].trim() : "";
}
export const tasksForAccount = (name: string, tasks: SheetRow[]) => tasks.filter(t => taskAccount(t) && nameKey(taskAccount(t)) === nameKey(name));

/** The task's title always says which account it is for, so a board full of tasks stays readable. */
export function taskTitle(what: string, account: string): string {
  const w = what.trim();
  return nameKey(w).includes(nameKey(account)) ? w : `${w} — ${account}`;
}

export const taskIsClosed = (t: SheetRow) => /done|complete|closed/i.test(t.Status || "");

// ── "This month's test": the client's one-line goal for the month, kept as a note so staff can update it ─────

export const MONTH_TEST_TYPE = "MONTH TEST";

export function latestMonthTest(notes: SheetRow[]): SheetRow | null {
  const mine = notes.filter(n => n["Source Type"] === MONTH_TEST_TYPE && /gardenia/i.test(n["Business / Area"] || ""));
  mine.sort((a, b) => new Date(b.Timestamp || 0).getTime() - new Date(a.Timestamp || 0).getTime());
  return mine[0] ?? null;
}

export function monthTestRow(text: string, user: string, now: Date): Record<string, string> {
  return {
    Timestamp: now.toISOString(),
    "Business / Area": PIPELINE_AREA,
    "Source Type": MONTH_TEST_TYPE,
    "Source ID": isoDay(now).slice(0, 7),
    Note: text.trim(),
    Author: user,
  };
}
