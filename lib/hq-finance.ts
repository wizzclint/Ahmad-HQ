import type { SheetRow } from "./hq-types";
import { parseNum } from "./hq-scorecard";
import { daysBetween, dayLabel, findDate, isoDay, nameKey, todayUTC, type WeekSpan } from "./hq-pipeline";

// The rules behind Finance & Office "Bills & payments": what arrives (an item), how much of it has been paid (its
// payments), and what needs attention. Pure functions, so every rule can be tested against real rows.

export const FINANCE_AREA = "Finance & Office";
export const ITEMS_SHEET = "HQ_FINANCE_ITEMS";
export const PAYMENTS_SHEET = "HQ_FINANCE_PAYMENTS";

const cents = (v: number) => Math.round(v * 100) / 100;
const usd = (v: number) => `$${cents(v).toLocaleString("en-US", { minimumFractionDigits: v % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
export const money = usd;

// ── What can arrive ──────────────────────────────────────────────────────────

export type FinType = { name: string; owed: boolean; accountLabel: string; accountHint: string; last4: boolean; referenceLabel: string; referenceHint: string; blurb: string };

/** `owed` is only the starting point: the form lets the person say whether money is owed on the item. */
export const FIN_TYPES: FinType[] = [
  { name: "Credit card", owed: true, accountLabel: "Card", accountHint: "e.g. Chase card", last4: true, referenceLabel: "Statement period", referenceHint: "e.g. September", blurb: "A credit-card bill. Its payments are tracked until it is paid off." },
  { name: "Debit card", owed: false, accountLabel: "Card / account", accountHint: "e.g. Operating debit card", last4: true, referenceLabel: "Charge or reference", referenceHint: "e.g. duplicate charge, fee notice", blurb: "A debit-card charge, fee or notice. Nothing is owed unless you say so." },
  { name: "Bank account", owed: false, accountLabel: "Bank / account", accountHint: "e.g. Operating account", last4: true, referenceLabel: "Statement period", referenceHint: "e.g. September", blurb: "A bank statement or notice to obtain, file or reconcile." },
  { name: "Vendor bill", owed: true, accountLabel: "Vendor", accountHint: "e.g. Plainfield Produce", last4: false, referenceLabel: "Invoice number", referenceHint: "e.g. INV-2041", blurb: "A bill from a supplier. Part payments are tracked until it is paid in full." },
  { name: "Loan / credit line", owed: true, accountLabel: "Lender / account", accountHint: "e.g. Chase LOC", last4: true, referenceLabel: "Statement or loan number", referenceHint: "e.g. Sept statement", blurb: "A loan or credit-line payment that is due." },
  { name: "Tax / compliance", owed: false, accountLabel: "Tax / agency", accountHint: "e.g. NJ sales tax", last4: false, referenceLabel: "Period or notice number", referenceHint: "e.g. Q3 2026", blurb: "A filing, notice or tax payment. Say if money is owed." },
  { name: "Payroll", owed: true, accountLabel: "Payroll / entity", accountHint: "e.g. ADP payroll", last4: false, referenceLabel: "Pay period", referenceHint: "e.g. Sep 14 – Sep 27", blurb: "Payroll to fund or reconcile." },
  { name: "Insurance", owed: true, accountLabel: "Insurer / policy", accountHint: "e.g. General liability", last4: false, referenceLabel: "Policy or renewal", referenceHint: "e.g. renewal Oct 1", blurb: "A premium or renewal." },
  { name: "Other", owed: false, accountLabel: "From", accountHint: "Who or what it is from", last4: false, referenceLabel: "Reference", referenceHint: "", blurb: "Anything else that arrives and needs following up." },
];
export const typeInfo = (name: string): FinType => FIN_TYPES.find(t => t.name === name) ?? FIN_TYPES[FIN_TYPES.length - 1];

export const PAYMENT_METHODS = ["ACH / bank transfer", "Check", "Credit card", "Debit card", "Wire", "Cash", "Other"] as const;
export const ITEM_STATUSES = ["Open", "On hold", "Done", "Cancelled"] as const;

// ── Items and their payments ─────────────────────────────────────────────────

export type FinPayment = { key: string; itemId: string; paidOn: Date | null; paidOnText: string; amount: number; method: string; reference: string; paidBy: string; notes: string };
export type FinState = "unpaid" | "partial" | "paid" | "todo" | "done" | "cancelled";
export type FinItem = {
  /** The row's ID (first column): what edit and delete find the row by. */
  key: string;
  row: SheetRow;
  type: string;
  entity: string;
  account: string;
  last4: string;
  reference: string;
  description: string;
  owner: string;
  manual: string;
  source: string;
  notes: string;
  received: Date | null;
  due: Date | null;
  /** The amount owed, when money is owed on this item. */
  amount: number | null;
  payable: boolean;
  payments: FinPayment[];
  paid: number;
  remaining: number | null;
  /** How much of it is paid, 0..1 (null when nothing is owed). */
  pct: number | null;
  overpaid: number;
  state: FinState;
  onHold: boolean;
  title: string;
};

const HOLD = /hold|disput/i;

export function paymentsFrom(rows: SheetRow[]): FinPayment[] {
  return rows
    .map(r => ({
      key: (r.ID || "").trim(), itemId: (r["Item ID"] || "").trim(),
      paidOn: findDate(r["Paid On"])?.date ?? null, paidOnText: (r["Paid On"] || "").trim(),
      amount: parseNum(r.Amount) ?? 0, method: (r.Method || "").trim(), reference: (r.Reference || "").trim(), paidBy: (r["Paid By"] || "").trim(), notes: (r.Notes || "").trim(),
    }))
    .filter(p => p.key && p.amount > 0);
}

export function itemsFrom(itemRows: SheetRow[], paymentRows: SheetRow[]): FinItem[] {
  const payments = paymentsFrom(paymentRows);
  return itemRows.map(row => {
    const key = (row.ID || "").trim();
    const amountRaw = parseNum(row["Amount Due"]);
    const amount = amountRaw !== null && amountRaw > 0 ? cents(amountRaw) : null;
    const mine = payments.filter(p => p.itemId === key).sort((a, b) => (a.paidOn?.getTime() ?? 0) - (b.paidOn?.getTime() ?? 0));
    const paid = cents(mine.reduce((s, p) => s + p.amount, 0));
    const manual = (row.Status || "").trim();
    const cancelled = /cancel/i.test(manual);
    const payable = amount !== null;
    const state: FinState = cancelled ? "cancelled"
      : payable ? (paid >= (amount as number) - 0.005 ? "paid" : paid > 0 ? "partial" : "unpaid")
      : /done|complete|filed|closed/i.test(manual) ? "done" : "todo";
    const account = (row["Account / Vendor"] || "").trim();
    const description = (row.Description || "").trim();
    const reference = (row.Reference || "").trim();
    return {
      key, row, type: (row.Type || "").trim(), entity: (row.Entity || "").trim(), account,
      last4: (row["Last 4"] || "").trim(), reference, description, owner: (row.Owner || "").trim(), manual,
      source: (row["Source / Email"] || "").trim(), notes: (row.Notes || "").trim(),
      received: findDate(row.Received)?.date ?? null, due: findDate(row["Due Date"])?.date ?? null,
      amount, payable, payments: mine, paid,
      remaining: payable ? Math.max(0, cents((amount as number) - paid)) : null,
      pct: payable ? Math.min(1, paid / (amount as number)) : null,
      overpaid: payable && paid > (amount as number) + 0.005 ? cents(paid - (amount as number)) : 0,
      state, onHold: HOLD.test(manual),
      title: account || description || row.Type || "Item",
    };
  }).filter(i => i.key);
}

export const isOpen = (i: FinItem) => i.state === "unpaid" || i.state === "partial" || i.state === "todo";
export const needsPaying = (i: FinItem) => i.state === "unpaid" || i.state === "partial";

export type DueState = "overdue" | "today" | "week" | "later" | "nodate";
/** Only open items have a due state; days is negative when late. */
export function dueState(i: FinItem, today: Date): { state: DueState; days: number | null } {
  if (!isOpen(i) || !i.due) return { state: "nodate", days: null };
  const days = daysBetween(i.due, today);
  return { state: days < 0 ? "overdue" : days === 0 ? "today" : days <= 7 ? "week" : "later", days };
}

export const isLate = (i: FinItem, today: Date) => dueState(i, today).state === "overdue";

const DUE_ORDER: Record<DueState, number> = { overdue: 0, today: 1, week: 2, later: 3, nodate: 4 };

/** Open items first, most urgent first (overdue, today, this week, later, no date); then everything finished, latest first. */
export function inUrgencyOrder(items: FinItem[], today: Date): FinItem[] {
  const open = items.filter(isOpen).map(i => ({ i, d: dueState(i, today) }));
  open.sort((a, b) => DUE_ORDER[a.d.state] - DUE_ORDER[b.d.state] || (a.i.due?.getTime() ?? 0) - (b.i.due?.getTime() ?? 0) || (b.i.amount ?? 0) - (a.i.amount ?? 0) || a.i.title.localeCompare(b.i.title));
  const finished = items.filter(i => !isOpen(i)).sort((a, b) => lastPaidTime(b) - lastPaidTime(a) || a.title.localeCompare(b.title));
  return [...open.map(x => x.i), ...finished];
}
const lastPaidTime = (i: FinItem) => Math.max(0, ...i.payments.map(p => p.paidOn?.getTime() ?? 0), i.received?.getTime() ?? 0);

export type FinFilter = "needs" | "overdue" | "partial" | "todo" | "done" | "all";
export const FILTERS: { id: FinFilter; label: string }[] = [
  { id: "needs", label: "Needs paying" }, { id: "overdue", label: "Overdue" }, { id: "partial", label: "Part paid" },
  { id: "todo", label: "To file / follow up" }, { id: "done", label: "Paid / done" }, { id: "all", label: "All" },
];
export function matchesFilter(i: FinItem, f: FinFilter, today: Date): boolean {
  switch (f) {
    case "needs": return needsPaying(i);
    case "overdue": return isLate(i, today);
    case "partial": return i.state === "partial";
    case "todo": return i.state === "todo";
    case "done": return i.state === "paid" || i.state === "done";
    default: return true;
  }
}

export function matchesSearch(i: FinItem, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = Object.values(i.row).join(" ").toLowerCase();
  return words.every(w => hay.includes(w));
}

/** Hidden from the finance page for now: anything that says it is personal (Ahmad's personal items are kept off it). */
export const isPersonal = (...parts: (string | undefined)[]) => /personal/i.test(parts.filter(Boolean).join(" "));

// ── Totals ───────────────────────────────────────────────────────────────────

export type FinanceTotals = {
  /** Still to pay across open bills. */
  owed: number; billsOpen: number;
  overdueCount: number; overdueAmount: number;
  dueWeekCount: number; dueWeekAmount: number;
  partialCount: number; partialPaid: number;
  todoCount: number; todoOverdue: number;
};

export function financeTotals(items: FinItem[], today: Date): FinanceTotals {
  const t: FinanceTotals = { owed: 0, billsOpen: 0, overdueCount: 0, overdueAmount: 0, dueWeekCount: 0, dueWeekAmount: 0, partialCount: 0, partialPaid: 0, todoCount: 0, todoOverdue: 0 };
  for (const i of items) {
    const d = dueState(i, today);
    if (i.state === "todo") { t.todoCount++; if (d.state === "overdue") t.todoOverdue++; continue; }
    if (!needsPaying(i)) continue;
    const left = i.remaining ?? 0;
    t.owed += left; t.billsOpen++;
    if (i.state === "partial") { t.partialCount++; t.partialPaid += i.paid; }
    if (d.state === "overdue") { t.overdueCount++; t.overdueAmount += left; }
    else if (d.state === "today" || d.state === "week") { t.dueWeekCount++; t.dueWeekAmount += left; }
  }
  for (const k of ["owed", "overdueAmount", "dueWeekAmount", "partialPaid"] as const) t[k] = cents(t[k]);
  return t;
}

// ── Cash position: what has to go out, and when ──────────────────────────────

const DAY_MS = 86_400_000;
/** Monday (UTC midnight) of the calendar week containing `day`. */
const mondayOf = (day: Date) => new Date(day.getTime() - ((day.getUTCDay() + 6) % 7) * DAY_MS);

export type CashBucketId = "overdue" | "this" | "next" | "after" | "later" | "nodate";
export type CashBucket = { id: CashBucketId; title: string; range: string; items: FinItem[]; amount: number };

/** Bills with something still to pay, grouped by the calendar week they are due (Monday to Sunday), plus what is overdue and what has no date. */
export function cashBuckets(items: FinItem[], today: Date): CashBucket[] {
  const monday = mondayOf(today);
  const at = (days: number) => new Date(monday.getTime() + days * DAY_MS);
  const week = (n: number) => `${dayLabel(at(7 * n), false)} – ${dayLabel(at(7 * n + 6), false)}`;
  const defs: [CashBucketId, string, string][] = [
    ["overdue", "Overdue", "Past the due date"],
    ["this", "This week", week(0)],
    ["next", "Next week", week(1)],
    ["after", "The week after", week(2)],
    ["later", "Later", `From ${dayLabel(at(21), false)}`],
    ["nodate", "No due date", "Add a due date so these can be planned"],
  ];
  const bucketOf = (i: FinItem): CashBucketId => {
    if (!i.due) return "nodate";
    if (i.due.getTime() < today.getTime()) return "overdue";
    const w = Math.floor((i.due.getTime() - monday.getTime()) / (7 * DAY_MS));
    return w <= 0 ? "this" : w === 1 ? "next" : w === 2 ? "after" : "later";
  };
  const open = items.filter(needsPaying);
  return defs.map(([id, title, range]) => {
    const mine = inUrgencyOrder(open.filter(i => bucketOf(i) === id), today);
    return { id, title, range, items: mine, amount: cents(mine.reduce((s, i) => s + (i.remaining ?? 0), 0)) };
  });
}

/** What was paid out this week (Monday to Sunday) and this calendar month. */
export function cashPaid(items: FinItem[], today: Date): { week: number; month: number } {
  const monday = mondayOf(today);
  const between = (start: Date, end: Date) => cents(items.reduce((sum, i) => sum + i.payments.reduce((s, p) => s + (p.paidOn && p.paidOn >= start && p.paidOn < end ? p.amount : 0), 0), 0));
  return {
    week: between(monday, new Date(monday.getTime() + 7 * DAY_MS)),
    month: between(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)), new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1))),
  };
}

export type KindTotal = { type: string; count: number; owed: number; overdue: number };

/** Still to pay, by kind of item (credit card, vendor bill, payroll...), largest first. */
export function owedByKind(items: FinItem[], today: Date): KindTotal[] {
  const map = new Map<string, KindTotal>();
  for (const i of items) {
    if (!needsPaying(i)) continue;
    const type = i.type || "Other";
    const row = map.get(type) ?? { type, count: 0, owed: 0, overdue: 0 };
    row.count++;
    row.owed += i.remaining ?? 0;
    if (isLate(i, today)) row.overdue += i.remaining ?? 0;
    map.set(type, row);
  }
  return [...map.values()].map(r => ({ ...r, owed: cents(r.owed), overdue: cents(r.overdue) })).sort((a, b) => b.owed - a.owed || a.type.localeCompare(b.type));
}

// ── Checks while entering (never blocking) ───────────────────────────────────

export type ItemValues = {
  type: string; entity: string; account: string; last4: string; reference: string; description: string;
  owed: boolean; amount: string; due: string; owner: string; source: string; notes: string;
};

/** The first thing that stops an item being saved, or "". */
export function itemError(v: ItemValues): string {
  if (!v.type) return "Choose what kind of item it is.";
  if (!v.account.trim()) return `Say which ${typeInfo(v.type).accountLabel.toLowerCase()} it is.`;
  if (v.last4.trim() && !/^\d{4}$/.test(v.last4.trim())) return "Last 4 must be exactly four digits (or leave it empty).";
  if (v.owed) {
    const n = parseNum(v.amount);
    if (n === null || n <= 0) return "Type the amount that is owed (a number above zero), or untick “Money is owed”.";
  }
  if (v.due.trim() && !findDate(v.due)) return "Pick the due date from the calendar (or leave it empty).";
  return "";
}

/** Things worth a second look (nothing here blocks saving). */
export function itemWarnings(v: ItemValues, items: FinItem[], today: Date, exceptKey?: string): string[] {
  const out: string[] = [];
  const dupe = items.find(i => i.key !== exceptKey && i.state !== "cancelled" && nameKey(i.account) === nameKey(v.account) && v.account.trim()
    && (v.reference.trim() ? nameKey(i.reference) === nameKey(v.reference) : v.owed && i.amount !== null && i.amount === parseNum(v.amount) && i.type === v.type));
  if (dupe) out.push(`Looks like “${dupe.title}${dupe.reference ? ` · ${dupe.reference}` : ""}” which is already entered${dupe.amount ? ` (${usd(dupe.amount)})` : ""}. Open that one instead of adding it twice.`);
  const due = findDate(v.due)?.date;
  if (due && v.owed && due.getTime() < today.getTime()) out.push(`The due date (${dayLabel(due)}) has already passed, so it will show as overdue.`);
  const n = parseNum(v.amount);
  if (v.owed && n !== null && n >= 1_000_000) out.push(`${usd(n)} is a very large amount. Check for an extra digit.`);
  return out;
}

export type PaymentValues = { amount: string; paidOn: string; method: string; reference: string; notes: string };

export function paymentError(v: PaymentValues): string {
  const n = parseNum(v.amount);
  if (n === null || n <= 0) return "Type the amount that was paid (a number above zero).";
  if (!findDate(v.paidOn)) return "Pick the date it was paid.";
  return "";
}

export function paymentWarnings(v: PaymentValues, item: FinItem, today: Date): string[] {
  const out: string[] = [];
  const n = parseNum(v.amount);
  if (n !== null && item.remaining !== null && n > item.remaining + 0.005) out.push(`${usd(n)} is more than the ${usd(item.remaining)} still owed on this bill, so it will show as overpaid by ${usd(n - item.remaining)}.`);
  const on = findDate(v.paidOn)?.date;
  if (on && on.getTime() > today.getTime()) out.push("The payment date is in the future.");
  return out;
}

// ── Rows to save ─────────────────────────────────────────────────────────────

export const cleanMoney = (s: string): string => { const n = parseNum(s); return n === null ? "" : String(cents(n)); };

export function itemRow(v: ItemValues, id: string, today: Date, user: string): Record<string, string> {
  const owed = v.owed && (parseNum(v.amount) ?? 0) > 0;
  return {
    ID: id, Received: isoDay(today), Type: v.type, Entity: v.entity.trim(), "Account / Vendor": v.account.trim(), "Last 4": v.last4.trim(),
    Reference: v.reference.trim(), Description: v.description.trim(), "Amount Due": owed ? cleanMoney(v.amount) : "",
    "Due Date": v.due.trim() ? isoDay(findDate(v.due)?.date ?? today) : "", Owner: v.owner.trim(), Status: "Open",
    "Source / Email": v.source.trim(), Notes: v.notes.trim(), "Logged By": user,
  };
}

export function paymentRow(v: PaymentValues, id: string, itemId: string, user: string): Record<string, string> {
  return { ID: id, "Item ID": itemId, "Paid On": isoDay(findDate(v.paidOn)?.date as Date), Amount: cleanMoney(v.amount), Method: v.method, Reference: v.reference.trim(), "Paid By": user, Notes: v.notes.trim() };
}

// ── History and the weekly close ─────────────────────────────────────────────

export const ACTION = { paid: "Payment Recorded", added: "Bill Added" } as const;

export function activityRow(i: { user: string; type: keyof typeof ACTION; itemId: string; detail: string; from?: string; to?: string; now: Date }): Record<string, string> {
  return {
    Timestamp: i.now.toISOString(), User: i.user, "Action Type": ACTION[i.type], "Business / Area": FINANCE_AREA,
    "Source Type": ITEMS_SHEET, "Source ID": i.itemId, "Old Value": i.from ?? "", "New Value": i.to ?? "", Detail: i.detail,
  };
}

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const bullets = (lines: string[], cap = 6) => [...lines.slice(0, cap).map(l => `• ${l}`), ...(lines.length > cap ? [`• …and ${lines.length - cap} more`] : [])].join("\n");

export type WeekPayments = { list: { p: FinPayment; item: FinItem | null }[]; total: number; paidInFull: FinItem[] };

/** Payments made in the week, and the bills those payments finished. */
export function weekPayments(items: FinItem[], span: WeekSpan): WeekPayments {
  const start = todayUTC(span.start), end = todayUTC(span.end);
  const inWeek = (p: FinPayment) => p.paidOn !== null && p.paidOn >= start && p.paidOn < end;
  const list: WeekPayments["list"] = [];
  for (const i of items) for (const p of i.payments) if (inWeek(p)) list.push({ p, item: i });
  list.sort((a, b) => (b.p.paidOn?.getTime() ?? 0) - (a.p.paidOn?.getTime() ?? 0));
  const finished = items.filter(i => i.state === "paid" && i.payments.some(inWeek));
  return { list, total: cents(list.reduce((s, x) => s + x.p.amount, 0)), paidInFull: finished };
}

export function numbersLine(items: FinItem[], week: WeekPayments, today: Date, span: WeekSpan): string {
  const t = financeTotals(items, today);
  return `Finance for ${span.label}: ${usd(week.total)} paid in ${plural(week.list.length, "payment")} · ${usd(t.owed)} still owed on ${plural(t.billsOpen, "open bill")} · ${t.overdueCount ? `${plural(t.overdueCount, "bill")} overdue (${usd(t.overdueAmount)})` : "nothing overdue"} · ${plural(t.dueWeekCount, "bill")} due in the next 7 days (${usd(t.dueWeekAmount)}).`;
}

/** A first draft of the four wrap-up boxes from the week's payments and what is still open. */
export function weekWrapUp(items: FinItem[], week: WeekPayments, today: Date): { wins: string; misses: string; blockers: string; next: string } {
  const wins = week.paidInFull.map(i => `${i.title}${i.reference ? ` (${i.reference})` : ""}: paid in full, ${usd(i.amount ?? i.paid)}`);
  const finishedKeys = new Set(week.paidInFull.map(i => i.key));
  const partial = new Map<string, { item: FinItem; total: number }>();
  for (const { p, item } of week.list) if (item && !finishedKeys.has(item.key)) partial.set(item.key, { item, total: cents((partial.get(item.key)?.total ?? 0) + p.amount) });
  for (const { item, total } of partial.values()) wins.push(`${item.title}: ${usd(total)} paid this week${item.remaining !== null ? `, ${usd(item.remaining)} still to pay` : ""}`);
  const open = items.filter(isOpen);
  const misses = open.filter(i => isLate(i, today)).sort((a, b) => (a.due?.getTime() ?? 0) - (b.due?.getTime() ?? 0)).map(i => {
    const late = -(dueState(i, today).days ?? 0);
    return `${i.title}${i.reference ? ` (${i.reference})` : ""}: ${i.remaining !== null ? `${usd(i.remaining)} ` : ""}was due ${dayLabel(i.due as Date, false)} (${plural(late, "day")} ago)`;
  });
  const blockers = open.filter(i => i.onHold).map(i => `${i.title}${i.reference ? ` (${i.reference})` : ""}: on hold${i.notes ? `, ${i.notes}` : ""}`);
  const next = open.filter(i => { const s = dueState(i, today).state; return s === "today" || s === "week"; })
    .sort((a, b) => (a.due?.getTime() ?? 0) - (b.due?.getTime() ?? 0))
    .map(i => `${i.title}${i.remaining !== null ? ` ${usd(i.remaining)}` : ""} · due ${dayLabel(i.due as Date, false)}${i.owner ? ` · ${i.owner}` : ""}`);
  return { wins: bullets(wins), misses: bullets(misses), blockers: bullets(blockers), next: bullets(next) };
}
