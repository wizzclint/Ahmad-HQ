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

// ── sales by channel: direct store vs corporate / online (the two channels the report measures) ─────────────

/** The report's two channel columns. Corporate and online are one figure in the report ("Corporate / Online Sales"). */
export const CHANNEL_COLUMNS = { direct: "Direct Store Sales", combined: "Corporate / Online Sales" } as const;

export type Channels = {
  /** Dollars per channel; null when not known. */
  direct: number | null;
  corpOnline: number | null;
  /** The channel that was worked out (net sales minus the other) rather than typed. */
  derived: { direct?: true; corpOnline?: true };
};

const cents = (v: number) => Math.round(v * 100) / 100;

/**
 * Where the week's sales came from, as the report works it out: direct store sales are net sales minus corporate / online
 * sales. Type either one and the other is worked out from net sales; type both and they are checked against it.
 * A worked-out figure below zero (the typed one is larger than net sales) is left unknown; the form points that out.
 */
export function channelSplit(row: Record<string, string | undefined>, net: number | null): Channels {
  const direct = parseNum(row[CHANNEL_COLUMNS.direct]);
  const corpOnline = parseNum(row[CHANNEL_COLUMNS.combined]);
  const rest = (typed: number | null) => (net !== null && typed !== null && net - typed >= 0 ? cents(net - typed) : null);
  if (direct !== null && corpOnline !== null) return { direct, corpOnline, derived: {} };
  if (corpOnline !== null) {
    const worked = rest(corpOnline);
    return { direct: worked, corpOnline, derived: worked === null ? {} : { direct: true } };
  }
  if (direct !== null) {
    const worked = rest(direct);
    return { direct, corpOnline: worked, derived: worked === null ? {} : { corpOnline: true } };
  }
  return { direct: null, corpOnline: null, derived: {} };
}

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
  /** Share of net sales from corporate / online orders (the report's "Online Sales %" and the "Online Sales Mix" KPI). */
  onlinePct: number | null;
  /** Share of net sales rung up in the store (the report's "Direct Sales %"). */
  directPct: number | null;
  channels: Channels;
  completionRate: number | null;
  targetVarDollars: number | null;
  targetVarPct: number | null;
  wow: number | null; // net sales vs the previous week entered
  yoy: number | null; // net sales vs the same week last year
  /** The report's "4-Week Avg Sales": this week and up to the three entered before it. */
  fourWeekAvg: number | null;
  notes: string;
};

export function weekMetrics(row: SheetRow, prevNetSales: number | null = null, earlierNet: (number | null)[] = []): WeekMetrics | null {
  const weekEnding = parseDate(row["Week Ending"]);
  if (!weekEnding) return null;
  const netSales = parseNum(row["Net Sales"]);
  const salesTarget = parseNum(row["Sales Target"]);
  const lySales = parseNum(row["Same Week LY Sales"]);
  const orders = parseNum(row.Orders);
  const channels = channelSplit(row, netSales);
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
    onlinePct: div(channels.corpOnline, netSales),
    directPct: div(channels.direct, netSales),
    channels,
    completionRate: div(parseNum(row["Completed Orders"]), parseNum(row["Eligible Orders"])),
    targetVarDollars: netSales === null || salesTarget === null ? null : netSales - salesTarget,
    targetVarPct: rel(netSales, salesTarget),
    wow: rel(netSales, prevNetSales),
    yoy: rel(netSales, lySales),
    fourWeekAvg: (() => {
      const sales = [netSales, ...earlierNet.slice(0, 3)].filter((v): v is number => v !== null);
      return sales.length ? sales.reduce((s, v) => s + v, 0) / sales.length : null;
    })(),
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
    const m = weekMetrics(r, prev, out.slice(-3).reverse().map(w => w.netSales));
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

// `kpi` matches the KPI column on the targets sheet. `help` / `how` are the plain-language fallbacks shown when the
// sheet's Definition / Calculation cells are blank, so staff can always find out what a number means.
type KpiDef = { key: string; kpi: string; label: string; kind: Kind; value: (m: WeekMetrics) => number | null; help: string; how: string };
export const KPIS: KpiDef[] = [
  { key: "netSales", kpi: "Net Sales", label: "Net sales", kind: "money0", value: m => m.netSales,
    help: "What the store sold in the week, after refunds and adjustments.", how: "Taken straight from the weekly sales report." },
  { key: "orders", kpi: "Orders", label: "Orders", kind: "count", value: m => m.orders,
    help: "How many customer orders were completed in the week.", how: "Taken straight from the weekly sales report." },
  { key: "avgTicket", kpi: "Average Ticket", label: "Average ticket", kind: "money2", value: m => m.avgTicket,
    help: "What a typical order is worth.", how: "Net sales ÷ orders." },
  { key: "laborPct", kpi: "Labor %", label: "Labor %", kind: "pct1", value: m => m.laborPct,
    help: "How much of every sales dollar goes to paying staff. Lower is better.", how: "Labor cost ÷ net sales." },
  { key: "salesPerLaborHour", kpi: "Sales / Labor Hour", label: "Sales / labor hour", kind: "money2", value: m => m.salesPerLaborHour,
    help: "How much each hour of staff time brings in.", how: "Net sales ÷ labor hours." },
  { key: "addOnAttach", kpi: "Add-on Attachment Rate", label: "Add-on attach", kind: "pct1", value: m => m.addOnAttach,
    help: "Out of every 100 orders, how many included an add-on.", how: "Orders with an add-on ÷ orders." },
  { key: "refundVoidPct", kpi: "Refund + Void %", label: "Refund + void", kind: "pct1", value: m => m.refundVoidPct,
    help: "How much of sales was given back or cancelled. Lower is better.", how: "(Refunds + voids) ÷ net sales." },
  { key: "completionRate", kpi: "Completion Rate", label: "Completion rate", kind: "pct1", value: m => m.completionRate,
    help: "Of the orders that could be fulfilled, how many were completed.", how: "Completed orders ÷ eligible orders." },
  { key: "directPct", kpi: "Direct Sales %", label: "Direct sales", kind: "pct1", value: m => m.directPct,
    help: "The share of sales rung up in the store itself, not through corporate or online orders.", how: "Direct store sales ÷ net sales. Direct store sales are net sales minus corporate / online sales, unless you type them." },
  { key: "onlinePct", kpi: "Online Sales Mix", label: "Online sales mix", kind: "pct1", value: m => m.onlinePct,
    help: "The share of sales that came through corporate and online orders.", how: "Corporate / online sales ÷ net sales." },
];

/** What a number means, from the targets sheet (falling back to the built-in wording). */
export type TileInfo = { definition: string; calculation: string; source: string; owner: string; note: string };

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
  green: number | null; // the sheet's thresholds, when set
  yellow: number | null;
  judgedByWeekTarget: boolean; // net sales: judged against that week's own Sales Target
  info: TileInfo;
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
      green,
      yellow,
      judgedByWeekTarget: isNetSales,
      info: {
        definition: (row?.Definition || "").trim() || def.help,
        calculation: (row?.Calculation || "").trim() || def.how,
        source: (row?.["Primary Source"] || "").trim(),
        owner: (row?.Owner || "").trim(),
        note: (row?.Notes || "").trim(),
      },
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

/** One plain sentence saying how this tile's colour is decided, worded from the sheet's own target and thresholds. */
export function statusRule(t: Tile): string {
  const fmt = (v: number | null) => formatValue(t.kind, v);
  if (t.higherIsBetter === null) return "Shown for context only, so it isn't coloured.";
  if (t.target === null) return "No target is set yet, so it isn't coloured. Add one in “Targets & definitions”.";
  const higher = t.higherIsBetter;
  if (t.judgedByWeekTarget) {
    return higher
      ? `Judged against this week's sales target (${fmt(t.target)}): On track at or above it, Watch within 10% below it, Off track further below.`
      : `Judged against this week's target (${fmt(t.target)}): On track at or below it, Watch within 10% above it, Off track further above.`;
  }
  const line = t.green ?? t.target;
  if (t.yellow !== null) {
    return higher
      ? `On track at ${fmt(line)} or more, Watch down to ${fmt(t.yellow)}, Off track below that.`
      : `On track at ${fmt(line)} or less, Watch up to ${fmt(t.yellow)}, Off track above that.`;
  }
  return higher
    ? `On track when it reaches ${fmt(line)}, Watch when it falls short. Nothing is called Off track until a warning level is set.`
    : `On track at ${fmt(line)} or less, Watch when it is higher. Nothing is called Off track until a warning level is set.`;
}

/** How many tiles are On track / Watch / Off track (tiles with no target, no data or context only aren't counted). */
export function statusCounts(tiles: Tile[]): { on: number; watch: number; off: number } {
  return {
    on: tiles.filter(t => t.status === "on").length,
    watch: tiles.filter(t => t.status === "watch").length,
    off: tiles.filter(t => t.status === "off").length,
  };
}

// ── "Sales by channel": each channel's dollars, share of sales, and how it moved ─────────────────────────────

export type ChannelKey = "direct" | "corpOnline";
export type ChannelRow = {
  key: ChannelKey;
  label: string;
  dollars: number | null;
  /** Share of net sales (0..1). */
  pct: number | null;
  /** Worked out from net sales rather than typed. */
  derived: boolean;
  /** Against the entry before this week: dollars, percent, and the change in share in percentage points. */
  dollarChange: number | null;
  dollarChangePct: number | null;
  pctChangePts: number | null;
  /** The target share from the targets sheet (Direct Sales %, Online Sales Mix) and how far the share is from it, in points. */
  target: number | null;
  vsTargetPts: number | null;
};
export type ChannelView = {
  rows: ChannelRow[];
  net: number | null;
  /** The entry the changes are measured against, and how many weeks earlier it was (1 = the week before). */
  previous: Date | null;
  weeksBack: number;
  /** One sentence putting the two channels side by side ("" until both are known). */
  gap: string;
};

const CHANNEL_LABEL: Record<ChannelKey, string> = { direct: "Direct store", corpOnline: "Corporate / online" };

export function channelView(week: WeekMetrics, previous: WeekMetrics | null, targets: SheetRow[]): ChannelView {
  const net = week.netSales;
  const targetOf = (kpi: string) => parseNum(targets.find(t => (t.KPI || "").trim().toLowerCase() === kpi.toLowerCase())?.Target);
  const rows: ChannelRow[] = (["direct", "corpOnline"] as const).map(key => {
    const dollars = week.channels[key], before = previous ? previous.channels[key] : null;
    const pct = div(dollars, net), beforePct = div(before, previous?.netSales ?? null);
    const target = targetOf(key === "direct" ? "Direct Sales %" : "Online Sales Mix");
    return {
      key,
      label: CHANNEL_LABEL[key],
      dollars, pct,
      derived: Boolean(week.channels.derived[key]),
      dollarChange: dollars === null || before === null ? null : cents(dollars - before),
      dollarChangePct: rel(dollars, before),
      pctChangePts: pct === null || beforePct === null ? null : (pct - beforePct) * 100,
      target,
      vsTargetPts: pct === null || target === null ? null : (pct - target) * 100,
    };
  });
  const { direct, corpOnline } = week.channels;
  let gap = "";
  if (direct !== null && corpOnline !== null && net) {
    const diff = corpOnline - direct;
    gap = `Corporate / online sales are ${formatValue("money0", Math.abs(diff))} ${diff >= 0 ? "more" : "less"} than direct store sales (${Math.abs((diff / net) * 100).toFixed(1)} points of net sales).`;
  }
  return { rows, net, previous: previous?.weekEnding ?? null, weeksBack: previous ? missingWeeks(previous.weekEnding, week.weekEnding) + 1 : 0, gap };
}

/** "direct 3.0% · corporate / online 97.0%"; "" when nothing is known. */
export function channelMix(week: WeekMetrics): string {
  const p = (v: number | null) => formatValue("pct1", v);
  if (week.directPct === null && week.onlinePct === null) return "";
  return `direct ${p(week.directPct)} · corporate / online ${p(week.onlinePct)}`;
}

// ── Net sales variance: the report's Target Var $ / %, WoW %, YoY % and 4-Week Avg Sales ─────────────────────

export type VarianceKey = "target" | "lastWeek" | "lastYear";
export type VarianceRow = {
  key: VarianceKey;
  label: string;
  /** What this week is compared with, in dollars (null when it wasn't entered). */
  basis: number | null;
  /** This week minus the basis, in dollars and as a share of the basis. */
  dollars: number | null;
  pct: number | null;
};
export type SalesVariance = {
  rows: VarianceRow[];
  /** Net sales averaged over this week and up to the three entered before it. */
  fourWeekAvg: number | null;
  /** The entry "last week" means, and how many weeks earlier it was (1 = the week before). */
  previous: Date | null;
  weeksBack: number;
};

export function salesVariance(week: WeekMetrics, previous: WeekMetrics | null): SalesVariance {
  const net = week.netSales;
  const row = (key: VarianceKey, label: string, basis: number | null): VarianceRow => ({ key, label, basis, dollars: net === null || basis === null ? null : cents(net - basis), pct: rel(net, basis) });
  return {
    rows: [
      row("target", "This week's sales target", week.salesTarget),
      row("lastWeek", "Last week", previous?.netSales ?? null),
      row("lastYear", "Same week last year", week.lySales),
    ],
    fourWeekAvg: week.fourWeekAvg,
    previous: previous?.weekEnding ?? null,
    weeksBack: previous ? missingWeeks(previous.weekEnding, week.weekEnding) + 1 : 0,
  };
}

// ── entering a week: suggestions and sanity checks ───────────────────────────

/** ISO week key such as "2026-W35" for a UTC-midnight date (what parseDate returns), so the week never shifts with the viewer's time zone. */
export function isoWeekKeyUTC(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** The entered week just before `date` (a week ending exactly on `date` doesn't count). */
export function weekBefore(weeks: WeekMetrics[], date: Date | null): WeekMetrics | null {
  const cutoff = date ? date.getTime() : Infinity;
  let found: WeekMetrics | null = null;
  for (const w of weeks) if (w.weekEnding.getTime() < cutoff) found = w; // weeks are oldest-first
  return found;
}

/** A week later than `from`, as YYYY-MM-DD (or "" when there is no week to follow). */
export function weekAfter(from: Date | null): string {
  return from ? new Date(from.getTime() + 7 * 86400000).toISOString().slice(0, 10) : "";
}

const money = (v: number) => formatValue("money0", v);

/**
 * Things worth a second look before a week is saved. They never block saving: the person entering the numbers
 * knows better than we do. Most catch a mistyped digit (10x or a tenth of last week) or numbers that can't all be true.
 */
export function weekWarnings(values: Record<string, string>, previous: WeekMetrics | null, today: Date): string[] {
  const n = (name: string) => parseNum(values[name]);
  const out: string[] = [];
  const week = parseDate(values["Week Ending"]);
  if (week && week.getTime() > today.getTime() + 86400000) out.push("The week-ending date is in the future.");

  const net = n("Net Sales");
  const prev = previous?.netSales ?? null;
  if (net !== null && net > 0 && prev !== null && prev > 0) {
    const ratio = net / prev;
    if (ratio >= 2.5) out.push(`Net sales ${money(net)} is ${ratio >= 9.5 ? "about " + Math.round(ratio) : ratio.toFixed(1)}× last week's ${money(prev)}. Check for an extra digit.`);
    else if (ratio <= 0.4) out.push(`Net sales ${money(net)} is only ${Math.round(ratio * 100)}% of last week's ${money(prev)}. Check for a missing digit.`);
  }

  const orders = n("Orders"), addOn = n("Add-on Orders"), eligible = n("Eligible Orders"), completed = n("Completed Orders");
  if (orders !== null && addOn !== null && addOn > orders) out.push(`${addOn} orders with an add-on is more than the ${orders} orders.`);
  if (eligible !== null && completed !== null && completed > eligible) out.push(`${completed} completed orders is more than the ${eligible} eligible orders.`);
  if (net !== null && net > 0) {
    const labor = n("Labor Cost"), corpOnline = n(CHANNEL_COLUMNS.combined), direct = n(CHANNEL_COLUMNS.direct);
    const giveBack = (n("Refund Amount") ?? 0) + (n("Void Amount") ?? 0);
    if (labor !== null && labor > net) out.push(`Labor cost ${money(labor)} is more than net sales ${money(net)}.`);
    if (giveBack > net) out.push(`Refunds and voids (${money(giveBack)}) are more than net sales ${money(net)}.`);
    if (corpOnline !== null && corpOnline > net) out.push(`Corporate / online sales ${money(corpOnline)} are more than net sales ${money(net)}.`);
    if (direct !== null && direct > net) out.push(`Direct store sales ${money(direct)} are more than net sales ${money(net)}.`);
    if (direct !== null && corpOnline !== null && Math.abs(direct + corpOnline - net) > 1) {
      out.push(`Direct store sales and corporate / online sales add up to ${money(direct + corpOnline)}, but net sales is ${money(net)} (${money(Math.abs(direct + corpOnline - net))} ${direct + corpOnline > net ? "too much" : "short"}).`);
    }
    const worked = channelSplit(values, net).direct;
    if (worked !== null && previous?.directPct != null) {
      const pts = (worked / net - previous.directPct) * 100;
      if (Math.abs(pts) >= 15) {
        out.push(`Direct store sales work out to ${formatValue("pct1", worked / net)} of net sales, ${pts > 0 ? "up" : "down"} ${Math.abs(pts).toFixed(0)} points from last week's ${formatValue("pct1", previous.directPct)}. Check that the corporate / online figure is complete.`);
      }
    }
  }
  const negative = ["Net Sales", "Sales Target", "Same Week LY Sales", "Orders", "Labor Hours", "Labor Cost", "Add-on Orders", "Refund Amount", "Void Amount", CHANNEL_COLUMNS.combined, CHANNEL_COLUMNS.direct, "Eligible Orders", "Completed Orders"]
    .filter(name => (n(name) ?? 0) < 0);
  if (negative.length) out.push(`${negative.join(", ")} ${negative.length > 1 ? "are" : "is"} negative.`);
  return out;
}

// ── actions tied to the numbers ──────────────────────────────────────────────

export type ActionRow = { id: string; title: string; owner: string; due: string; status: string; why: string; escalated: boolean; blocked: boolean; row: SheetRow };

/** The store's still-open work items, from raw Work-sheet rows. */
export function openActions(rows: SheetRow[]): ActionRow[] {
  return rows
    .filter(r => !/done|complete|closed/i.test(r.Status || ""))
    .map(r => ({
      id: r.ID || "",
      title: r["Work Item / Next Action"] || "Untitled",
      owner: r.Owner || "",
      due: r["Due Date"] || "",
      status: r.Status || "",
      why: r["WHY / OUTCOME SUPPORTED"] || "",
      escalated: /^yes/i.test(r["Management Escalation?"] || ""),
      blocked: /^yes/i.test(r["Blocked?"] || ""),
      row: r,
    }));
}

/** The text stored in an action's "why" cell so the action can be found again from the number it answers. */
export const kpiTag = (kpiLabel: string, why = "") => `KPI: ${kpiLabel}${why.trim() ? ` — ${why.trim()}` : ""}`;

/** Actions created from this KPI's miss (they carry its tag). */
export function actionsForKpi(kpiLabel: string, actions: ActionRow[]): ActionRow[] {
  const tag = `KPI: ${kpiLabel}`.toLowerCase();
  return actions.filter(a => {
    const why = a.why.trim().toLowerCase();
    return why === tag || why.startsWith(tag + " —");
  });
}

const bullets = (lines: string[]) => lines.map(l => `• ${l}`).join("\n");
const actionLine = (a: ActionRow) => `${a.title}${a.owner ? ` (${a.owner}${a.due ? `, due ${a.due}` : ""})` : a.due ? ` (due ${a.due})` : ""}`;

/** First draft of the weekly wrap-up, from the numbers and the open actions. People edit it before saving. */
export function wrapUpDraft(tiles: Tile[], flagged: { text: string }[], actions: ActionRow[]): { wins: string; misses: string; blockers: string; next: string } {
  const wins = tiles.filter(t => t.status === "on").map(t => `${t.label} on track (${t.valueText}${t.targetText ? ` vs ${t.targetText} target` : ""})`);
  const needsDecision = actions.filter(a => a.escalated).map(a => `Needs Ahmad: ${actionLine(a)}`);
  const blocked = actions.filter(a => a.blocked && !a.escalated).map(a => `Blocked: ${actionLine(a)}`);
  const next = actions.filter(a => !a.escalated && !a.blocked).map(actionLine);
  return { wins: bullets(wins), misses: bullets(flagged.map(f => f.text)), blockers: bullets([...needsDecision, ...blocked]), next: bullets(next) };
}

/** One line of headline numbers to keep with a saved wrap-up. */
export function numbersLine(week: WeekMetrics, tiles: Tile[], weekLabel: string): string {
  const v = (key: string) => tiles.find(t => t.key === key)?.valueText ?? "—";
  const vs = week.targetVarPct === null ? "" : ` (${week.targetVarPct >= 0 ? "+" : "−"}${Math.abs(week.targetVarPct * 100).toFixed(1)}% vs target)`;
  const mix = channelMix(week);
  return `Numbers for the week ending ${weekLabel}: net sales ${v("netSales")}${vs} · orders ${v("orders")} · labor ${v("laborPct")} · average ticket ${v("avgTicket")} · refund + void ${v("refundVoidPct")}${mix ? ` · sales mix: ${mix}` : ""}.`;
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
