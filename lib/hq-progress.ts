import type { HqBootstrap, SheetRow } from "./hq-types";

// Pure progress maths for the Home charts. Kept free of React and of app/page.tsx
// so it can be tested on its own against a snapshot of the sheet data.

export type StageKey = "todo" | "progress" | "review" | "done";

// Listed in reading order for the stacked bars: finished work sits at the left, on a common baseline.
export const STAGES: { key: StageKey; label: string }[] = [
  { key: "done", label: "Done" },
  { key: "review", label: "In review" },
  { key: "progress", label: "In progress" },
  { key: "todo", label: "To do" },
];

// Same keywords the boards use, so a card's column and its chart segment always agree.
export function stageOf(status: string | undefined): StageKey {
  const s = (status || "").toLowerCase();
  if (/done|complete|closed/.test(s)) return "done";
  if (/review|test/.test(s)) return "review";
  if (/progress/.test(s)) return "progress";
  return "todo";
}

const WORK_AREAS: { id: string; label: string; match: RegExp }[] = [
  { id: "store", label: "Edible - Store", match: /edible/i },
  { id: "gardenia", label: "Gardenia's Fire", match: /gardenia/i },
  { id: "finance", label: "Finance & Office", match: /finance/i },
  { id: "iron", label: "Iron Marks", match: /iron/i },
  { id: "property", label: "Buyahka / Property", match: /property/i },
  { id: "people", label: "People & Systems", match: /people|systems/i },
  { id: "personal", label: "Personal / Ahmad", match: /personal|ahmad/i },
];

const ROW_ORDER = ["store", "gardenia", "finance", "iron", "fireflies", "property", "people", "personal", "other"];
const ROW_LABEL: Record<string, string> = {
  ...Object.fromEntries(WORK_AREAS.map(a => [a.id, a.label])),
  fireflies: "Fireflies & Legacy",
  other: "Other",
};

export type AreaProgress = {
  id: string;
  label: string;
  counts: Record<StageKey, number>;
  total: number;
  pct: number;
};

const emptyCounts = (): Record<StageKey, number> => ({ todo: 0, progress: 0, review: 0, done: 0 });
const pctOf = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0);

type ProgressInput = Pick<HqBootstrap, "work" | "gardeniaTasks" | "ironTasks" | "firefliesLegacy">;

// Task status counts per area. Work-sheet rows are filed by their "Project / Function";
// the dedicated task sheets (Gardenia, Iron Marks, Fireflies & Legacy) belong to their own area.
export function areaProgress(d: ProgressInput): AreaProgress[] {
  const buckets: Record<string, Record<StageKey, number>> = {};
  const add = (id: string, status: string | undefined) => {
    (buckets[id] ||= emptyCounts())[stageOf(status)]++;
  };
  for (const r of d.work) {
    const fn = r["Project / Function"] || "";
    add(WORK_AREAS.find(a => a.match.test(fn))?.id ?? "other", r.Status);
  }
  for (const r of d.gardeniaTasks) add("gardenia", r.Status);
  for (const r of d.ironTasks) add("iron", r.Status);
  for (const r of d.firefliesLegacy) add("fireflies", r.Status);

  return ROW_ORDER
    .filter(id => buckets[id])
    .map(id => {
      const counts = buckets[id];
      const total = counts.todo + counts.progress + counts.review + counts.done;
      return { id, label: ROW_LABEL[id], counts, total, pct: pctOf(counts.done, total) };
    })
    .filter(a => a.total > 0);
}

export function overallProgress(areas: AreaProgress[]) {
  const counts = emptyCounts();
  for (const a of areas) for (const s of STAGES) counts[s.key] += a.counts[s.key];
  const total = counts.todo + counts.progress + counts.review + counts.done;
  return { counts, total, done: counts.done, open: total - counts.done, pct: pctOf(counts.done, total) };
}

// Gardenia's Fire sales funnel, in order. A stage that matches nothing falls back to the first, like the board.
export const SALES_STAGES: { label: string; test: RegExp | null }[] = [
  { label: "To Research", test: null },
  { label: "Priority", test: /priority/ },
  { label: "Attempted", test: /attempt/ },
  { label: "Qualified", test: /qualif/ },
  { label: "Tasting Scheduled", test: /tasting sched/ },
  { label: "Tasting Completed", test: /tasting comp/ },
  { label: "First Order Won", test: /first order/ },
  { label: "Recurring Won", test: /recurring/ },
];

export function pipelineCounts(rows: SheetRow[]): { label: string; value: number }[] {
  const counts = SALES_STAGES.map(s => ({ label: s.label, value: 0 }));
  for (const r of rows) {
    const v = (r.Stage || "").toLowerCase();
    const i = SALES_STAGES.findIndex(s => s.test && s.test.test(v));
    counts[i === -1 ? 0 : i].value++;
  }
  return counts;
}

export type WeekBin = { start: string; created: number; completed: number };

const parseWhen = (v: string | undefined): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Monday 00:00 (local) of the week containing d.
function weekStart(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}

// Tasks created vs completed per week over the last `weeks` weeks.
//   created   = Work rows by "Created / Captured", plus "Task Assigned" log rows for the dedicated
//               task sheets (Work rows are already counted from the sheet itself, so they're skipped here)
//   completed = Work rows by "COMPLETED AT", plus "Task Completed" log rows (written when a task on a
//               dedicated sheet is moved to Done)
export function weeklyActivity(d: Pick<HqBootstrap, "work" | "activity">, weeks = 8, now = new Date()): { bins: WeekBin[]; total: number } {
  const first = weekStart(now);
  first.setDate(first.getDate() - 7 * (weeks - 1));
  const bins: WeekBin[] = Array.from({ length: weeks }, (_, i) => {
    const s = new Date(first);
    s.setDate(s.getDate() + 7 * i);
    return { start: s.toISOString(), created: 0, completed: 0 };
  });
  const bump = (when: Date | null, key: "created" | "completed") => {
    if (!when) return;
    const i = Math.floor((weekStart(when).getTime() - first.getTime()) / (7 * 86400000) + 0.5);
    if (i >= 0 && i < weeks) bins[i][key]++;
  };
  for (const r of d.work) {
    bump(parseWhen(r["Created / Captured"]), "created");
    bump(parseWhen(r["COMPLETED AT"]), "completed");
  }
  for (const a of d.activity) {
    if (a["Action Type"] === "Task Assigned" && a["Source Type"] !== "HQ_WORK") bump(parseWhen(a.Timestamp), "created");
    if (a["Action Type"] === "Task Completed") bump(parseWhen(a.Timestamp), "completed");
  }
  return { bins, total: bins.reduce((n, b) => n + b.created + b.completed, 0) };
}
