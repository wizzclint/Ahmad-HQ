import type { SheetRow } from "./hq-types";

// The Edible store scorecard maths. Weekly rows hold raw inputs; everything derived is computed
// here the way the workbook's formulas did, so the team only ever enters what they can count.
// Pure functions (no React, no network) so they can be tested against the workbook's own numbers.

// ── parsing ──────────────────────────────────────────────────────────────────

/** "$6,785.08" -> 6785.08, "22%" -> 0.22, "0.22" -> 0.22, "" -> null. */
export function parseNum(v: string | number | undefined | null): number | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const pct = s.endsWith("%");
  const n = parseFloat(s.replace(/[$,%\s]/g, ""));
  if (Number.isNaN(n)) return null;
  return pct ? n / 100 : n;
}

/** ISO date/month ("2026-08-30", "2026-07"), US dates ("8/30/2026"), or an Excel serial (46264). Returns UTC midnight. */
export function parseDate(v: string | undefined | null): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(s);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, m[3] ? +m[3] : 1));
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (m) return new Date(Date.UTC(+m[3], +m[1] - 1, +m[2]));
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = parseFloat(s);
    if (serial > 30000 && serial < 70000) return new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000);
  }
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

const div = (a: number | null, b: number | null) => (a === null || b === null || b === 0 ? null : a / b);
const rel = (a: number | null, b: number | null) => (a === null || b === null || b === 0 ? null : a / b - 1);

// ── weekly metrics ───────────────────────────────────────────────────────────

export type WeekMetrics = {
  /** The row's first-column value exactly as the sheet holds it: the key the generic edit/delete find a row by. */
  id: string;
  /** The raw sheet row, so an editor can be pre-filled with exactly what is stored. */
  row: SheetRow;
  weekEnding: Date;
  netSales: number | null;
  salesTarget: number | null;
  lySales: number | null;
  orders: number | null;
  avgTicket: number | null;
  laborPct: number | null;
  salesPerLaborHour: number | null;
  addOnAttach: number | null;
  refundVoidPct: number | null;
  onlinePct: number | null;
  directPct: number | null;
  completionRate: number | null;
  targetVarDollars: number | null;
  targetVarPct: number | null;
  wow: number | null; // net sales vs the previous week entered
  yoy: number | null; // net sales vs the same week last year
  notes: string;
};

export function weekMetrics(row: SheetRow, prevNetSales: number | null = null): WeekMetrics | null {
  const weekEnding = parseDate(row["Week Ending"]);
  if (!weekEnding) return null;
  const netSales = parseNum(row["Net Sales"]);
  const salesTarget = parseNum(row["Sales Target"]);
  const lySales = parseNum(row["Same Week LY Sales"]);
  const orders = parseNum(row.Orders);
  const online = parseNum(row["Corporate / Online Sales"]);
  const refund = parseNum(row["Refund Amount"]);
  const voided = parseNum(row["Void Amount"]);
  return {
    id: row["Week Ending"],
    row,
    weekEnding,
    netSales,
    salesTarget,
    lySales,
    orders,
    avgTicket: div(netSales, orders),
    laborPct: div(parseNum(row["Labor Cost"]), netSales),
    salesPerLaborHour: div(netSales, parseNum(row["Labor Hours"])),
    addOnAttach: div(parseNum(row["Add-on Orders"]), orders),
    refundVoidPct: refund === null && voided === null ? null : div((refund ?? 0) + (voided ?? 0), netSales),
    onlinePct: div(online, netSales),
    directPct: netSales === null || online === null ? null : div(netSales - online, netSales),
    completionRate: div(parseNum(row["Completed Orders"]), parseNum(row["Eligible Orders"])),
    targetVarDollars: netSales === null || salesTarget === null ? null : netSales - salesTarget,
    targetVarPct: rel(netSales, salesTarget),
    wow: rel(netSales, prevNetSales),
    yoy: rel(netSales, lySales),
    notes: row.Notes || "",
  };
}

/** Every valid week, oldest first, each compared with the one entered before it. */
export function weeklySeries(rows: SheetRow[]): WeekMetrics[] {
  const dated = rows
    .map(r => ({ r, d: parseDate(r["Week Ending"]) }))
    .filter((x): x is { r: SheetRow; d: Date } => x.d !== null)
    .sort((a, b) => a.d.getTime() - b.d.getTime());
  const out: WeekMetrics[] = [];
  let prev: number | null = null;
  for (const { r } of dated) {
    const m = weekMetrics(r, prev);
    if (!m) continue;
    out.push(m);
    prev = m.netSales;
  }
  return out;
}

/**
 * How many whole weeks were skipped between two consecutive entries (0 when they are a week apart).
 * Week endings are not always the same weekday, so 8 or 10 days still counts as consecutive.
 */
export function missingWeeks(prev: Date, cur: Date): number {
  const days = (cur.getTime() - prev.getTime()) / 86400000;
  return Math.max(0, Math.round(days / 7) - 1);
}

/** The calendar years that have at least one week, newest first. */
export function weekYears(weeks: WeekMetrics[]): number[] {
  return [...new Set(weeks.map(w => w.weekEnding.getUTCFullYear()))].sort((a, b) => b - a);
}

// ── KPI tiles and statuses ───────────────────────────────────────────────────

export type Kind = "money0" | "money2" | "count" | "pct1";
export type Status = "on" | "watch" | "off" | "none" | "nodata" | "context";

export const STATUS_LABEL: Record<Status, string> = { on: "On track", watch: "Watch", off: "Off track", none: "No target", nodata: "No data", context: "Context" };

const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function formatValue(kind: Kind, v: number | null): string {
  if (v === null || Number.isNaN(v)) return "—";
  switch (kind) {
    case "money0": return `$${nf0.format(v)}`;
    case "money2": return `$${nf2.format(v)}`;
    case "count": return nf0.format(v);
    case "pct1": return `${(v * 100).toFixed(1)}%`;
  }
}

type KpiDef = { key: string; kpi: string; label: string; kind: Kind; value: (m: WeekMetrics) => number | null };
// `kpi` matches the KPI column on the targets sheet.
export const KPIS: KpiDef[] = [
  { key: "netSales", kpi: "Net Sales", label: "Net sales", kind: "money0", value: m => m.netSales },
  { key: "orders", kpi: "Orders", label: "Orders", kind: "count", value: m => m.orders },
  { key: "avgTicket", kpi: "Average Ticket", label: "Average ticket", kind: "money2", value: m => m.avgTicket },
  { key: "laborPct", kpi: "Labor %", label: "Labor %", kind: "pct1", value: m => m.laborPct },
  { key: "salesPerLaborHour", kpi: "Sales / Labor Hour", label: "Sales / labor hour", kind: "money2", value: m => m.salesPerLaborHour },
  { key: "addOnAttach", kpi: "Add-on Attachment Rate", label: "Add-on attach", kind: "pct1", value: m => m.addOnAttach },
  { key: "refundVoidPct", kpi: "Refund + Void %", label: "Refund + void", kind: "pct1", value: m => m.refundVoidPct },
  { key: "completionRate", kpi: "Completion Rate", label: "Completion rate", kind: "pct1", value: m => m.completionRate },
  { key: "directPct", kpi: "Direct Sales %", label: "Direct sales", kind: "pct1", value: m => m.directPct },
  { key: "onlinePct", kpi: "Online Sales Mix", label: "Online sales mix", kind: "pct1", value: m => m.onlinePct },
];

export type Tile = {
  key: string;
  label: string;
  kind: Kind;
  value: number | null;
  valueText: string;
  target: number | null;
  targetText: string;
  status: Status;
  higherIsBetter: boolean | null;
  change: string; // vs the previous week
};

/**
 * Status rule, matching how the workbook behaved:
 *  - green/yellow thresholds from the targets sheet decide on track / watch / off track;
 *  - a KPI with only a target (no thresholds) is on track when it meets the target and "watch" when it
 *    doesn't. Nobody has defined what "bad" means for it yet, so it is never called off track;
 *  - `bandFromTarget` (Net sales, judged against the week's own Sales Target) uses a 10% band instead:
 *    within 10% = watch, worse = off track;
 *  - "Contextual" KPIs (e.g. online mix) never get a colour.
 */
export function kpiStatus(
  value: number | null,
  target: number | null,
  direction: string,
  green: number | null,
  yellow: number | null,
  bandFromTarget = false,
): Status {
  if (/context/i.test(direction)) return "context";
  if (value === null) return "nodata";
  if (target === null) return "none";
  const lower = /lower/i.test(direction);
  const yellowLine = yellow ?? (bandFromTarget ? (lower ? target * 1.1 : target * 0.9) : null);
  if (lower) {
    if (value <= (green ?? target)) return "on";
    if (yellowLine === null) return "watch";
    return value <= yellowLine ? "watch" : "off";
  }
  if (value >= (green ?? target)) return "on";
  if (yellowLine === null) return "watch";
  return value >= yellowLine ? "watch" : "off";
}

function changeText(kind: Kind, now: number | null, before: number | null): string {
  if (now === null || before === null) return "";
  if (kind === "pct1") {
    const pts = (now - before) * 100;
    return `${pts >= 0 ? "+" : "−"}${Math.abs(pts).toFixed(1)} pts`;
  }
  if (before === 0) return "";
  const r = (now / before - 1) * 100;
  return `${r >= 0 ? "+" : "−"}${Math.abs(r).toFixed(1)}%`;
}

/** One tile per KPI for `week`, judged against the targets sheet, compared with `previous`. */
export function scorecard(week: WeekMetrics, previous: WeekMetrics | null, targets: SheetRow[]): Tile[] {
  return KPIS.map(def => {
    const row = targets.find(t => (t.KPI || "").trim().toLowerCase() === def.kpi.toLowerCase());
    const direction = row?.Direction || "";
    const isNetSales = def.key === "netSales";
    const target = isNetSales ? (week.salesTarget ?? parseNum(row?.Target)) : parseNum(row?.Target);
    const green = isNetSales ? null : parseNum(row?.["Green Threshold"]);
    const yellow = isNetSales ? null : parseNum(row?.["Yellow Threshold"]);
    const value = def.value(week);
    const status = kpiStatus(value, target, direction || "Higher is better", green, yellow, isNetSales);
    return {
      key: def.key,
      label: def.label,
      kind: def.kind,
      value,
      valueText: formatValue(def.kind, value),
      target,
      targetText: target === null ? "" : formatValue(def.kind, target),
      status,
      higherIsBetter: /context/i.test(direction) ? null : !/lower/i.test(direction),
      change: previous ? changeText(def.kind, value, def.value(previous)) : "",
    };
  });
}

/**
 * The biggest misses first, worded the way the workbook's exception list was. Size of miss is measured
 * as the workbook's "vs Target" column does: percentage points for rates (labor +17.5 pts), percent of
 * target for money and counts (sales −27%). A relative measure would rank a 4.1% refund rate against a
 * 0.5% target as "8x off" and bury the sales miss.
 */
export function attention(tiles: Tile[], max = 3): { key: string; text: string }[] {
  return tiles
    .filter(t => t.status === "off" && t.value !== null && t.target !== null && t.target !== 0)
    .map(t => {
      const value = t.value as number, target = t.target as number;
      return { t, severity: t.kind === "pct1" ? Math.abs(value - target) * 100 : (Math.abs(value - target) / Math.abs(target)) * 100 };
    })
    .sort((a, b) => b.severity - a.severity)
    .slice(0, max)
    .map(({ t }) => {
      const gap = ((t.value as number) / (t.target as number) - 1) * 100;
      const dir = t.higherIsBetter === false ? "above" : "below";
      const variance = t.kind === "pct1" ? "" : `, ${gap >= 0 ? "+" : "−"}${Math.abs(gap).toFixed(1)}%`;
      return { key: t.key, text: `${t.label} ${dir} target (${t.valueText} vs ${t.targetText}${variance})` };
    });
}

// ── monthly KSI review ───────────────────────────────────────────────────────

export type KsiItem = { id: string; ksi: string; score: number; movement: number | null; reason: string; action: string; owner: string; due: string };

/** The latest month's scores (in sheet order) and their average. Scores run -10..+10. */
export function ksiSummary(rows: SheetRow[]): { month: Date | null; items: KsiItem[]; overall: number | null } {
  const scored = rows
    .map(r => ({ r, month: parseDate(r.Month), score: parseNum(r["Current Score"]) }))
    .filter((x): x is { r: SheetRow; month: Date; score: number } => x.month !== null && x.score !== null);
  if (!scored.length) return { month: null, items: [], overall: null };
  const latest = Math.max(...scored.map(x => x.month.getTime()));
  const items = scored
    .filter(x => x.month.getTime() === latest)
    .map(x => {
      const earlier = scored
        .filter(y => y.r.KSI === x.r.KSI && y.month.getTime() < latest)
        .sort((a, b) => b.month.getTime() - a.month.getTime())[0];
      const prev = parseNum(x.r["Previous Score"]) ?? earlier?.score ?? null;
      return {
        id: x.r["Review ID"] || `${x.r.Month}|${x.r.KSI}`,
        ksi: x.r.KSI || "",
        score: x.score,
        movement: prev === null ? null : x.score - prev,
        reason: x.r["Evidence / Reason"] || "",
        action: x.r["One Improvement Action"] || "",
        owner: x.r.Owner || "",
        due: x.r["Due Date"] || "",
      };
    });
  return { month: new Date(latest), items, overall: items.reduce((s, i) => s + i.score, 0) / items.length };
}
