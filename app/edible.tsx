"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { SheetRow } from "@/lib/hq-types";
import { STATUS_LABEL, attention, formatValue, ksiSummary, missingWeeks, parseDate, parseNum, scorecard, weekYears, weeklySeries, type Status, type Tile, type WeekMetrics } from "@/lib/hq-scorecard";
import { ChartCard, Empty, TipBox, TrendChart, useTip } from "./charts";

// The Edible - Store KPI scorecard: the report's weekly numbers judged against its targets, what needs
// attention, the sales trend and the monthly KSI review, plus everything for managing the weeks themselves
// (add, edit, delete, and a list that stays quick however many weeks pile up). The page supplies the saving.

const dateLabel = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
const dateLabelYear = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const monthLabel = (d: Date) => d.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
const signed = (n: number, digits = 0) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(digits)}`;

// Status is always shown as an icon AND a label (never colour alone). Colours are the fixed status palette.
const STATUS_VIEW: Record<Status, { glyph: string; color: string; ink: string }> = {
  on: { glyph: "✓", color: "var(--st-on)", ink: "#fff" },
  watch: { glyph: "!", color: "var(--st-watch)", ink: "#18302b" }, // dark glyph: white on yellow is unreadable
  off: { glyph: "✕", color: "var(--st-off)", ink: "#fff" },
  none: { glyph: "–", color: "var(--st-none)", ink: "#fff" },
  nodata: { glyph: "–", color: "var(--st-none)", ink: "#fff" },
  context: { glyph: "i", color: "var(--st-none)", ink: "#fff" },
};

function StatusPill({ status }: { status: Status }) {
  const v = STATUS_VIEW[status];
  return (
    <span className="score-status">
      <span className="score-dot" style={{ background: v.color, color: v.ink }} aria-hidden="true">{v.glyph}</span>
      {STATUS_LABEL[status]}
    </span>
  );
}

function ScoreTile({ tile }: { tile: Tile }) {
  const v = STATUS_VIEW[tile.status];
  const target = tile.targetText ? `Target ${tile.targetText}` : tile.status === "context" ? "For context" : "No target set";
  return (
    <article
      className="card score-tile"
      style={{ borderTopColor: v.color }}
      aria-label={`${tile.label}: ${tile.valueText}. ${target}. ${STATUS_LABEL[tile.status]}.`}
    >
      <span className="score-label">{tile.label}</span>
      <strong className="score-value">{tile.valueText}</strong>
      <span className="score-target">{target}</span>
      <div className="score-foot">
        <StatusPill status={tile.status} />
        {tile.change && <small>{tile.change} vs last wk</small>}
      </div>
    </article>
  );
}

// Monthly KSI review: each KSI scored -10..+10, drawn from a centre line so negatives read as "left of zero".
function KsiReview({ rows }: { rows: SheetRow[] }) {
  const { month, items, overall } = useMemo(() => ksiSummary(rows), [rows]);
  const { box, tip, hide, onPointer, onFocus } = useTip();
  if (!items.length) {
    return (
      <ChartCard className="viz-full" title="Monthly KSI review" note="Eight KSIs scored −10 to +10 each month" table={<p className="sub">No KSI scores yet.</p>}>
        <Empty>No KSI scores yet. Add a month of scores in the table below.</Empty>
      </ChartCard>
    );
  }
  const groups = [items.slice(0, Math.ceil(items.length / 2)), items.slice(Math.ceil(items.length / 2))].filter(g => g.length);
  return (
    <ChartCard
      className="viz-full"
      title={`Monthly KSI review · ${month ? monthLabel(month) : ""}`}
      note={`Overall ${overall !== null ? signed(overall, 1) : "—"} (average of ${items.length} KSIs, on a −10 to +10 scale)`}
      table={(
        <table>
          <thead><tr><th>KSI</th><th>Score</th><th>Change</th><th>Evidence / reason</th><th>Improvement action</th><th>Owner</th></tr></thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id}><th scope="row">{i.ksi}</th><td>{signed(i.score)}</td><td>{i.movement === null ? "—" : signed(i.movement)}</td><td>{i.reason || "—"}</td><td>{i.action || "—"}</td><td>{i.owner || "—"}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    >
      <div className="viz-plot" ref={box} onPointerLeave={hide}>
        <div className="ksi-cols">
          {groups.map((group, g) => (
            <div key={g}>
              {group.map(i => {
                const half = Math.min(Math.abs(i.score), 10) * 5; // percent of the full track on one side of centre
                const rows = [
                  { label: "score", value: signed(i.score) },
                  ...(i.movement !== null ? [{ label: "vs previous", value: signed(i.movement) }] : []),
                  ...(i.reason ? [{ label: i.reason, value: "Why" }] : []),
                  ...(i.action ? [{ label: i.action, value: "Next" }] : []),
                ];
                return (
                  <div
                    className="viz-row viz-row-bar ksi-row"
                    key={i.id}
                    tabIndex={0}
                    onPointerMove={onPointer(i.ksi, rows)}
                    onFocus={onFocus(i.ksi, rows)}
                    onBlur={hide}
                  >
                    <span className="viz-row-label">{i.ksi}</span>
                    <div className="ksi-track">
                      <span className="ksi-zero" aria-hidden="true" />
                      {i.score !== 0 && (
                        <span
                          className={`ksi-bar ${i.score > 0 ? "pos" : "neg"}`}
                          style={i.score > 0 ? { left: "50%", width: `${half}%` } : { right: "50%", width: `${half}%` }}
                        />
                      )}
                    </div>
                    <span className="ksi-val">{signed(i.score)}</span>
                  </div>
                );
              })}
              <div className="ksi-scale" aria-hidden="true"><span>−10</span><span>0</span><span>+10</span></div>
            </div>
          ))}
        </div>
        <TipBox tip={tip} />
      </div>
    </ChartCard>
  );
}

// ── Weeks: add, edit, delete, and a list that stays usable at 100+ rows ───────

// One row per week, raw inputs only — the scorecard derives the rest, so nobody types a percentage.
const WEEK_FIELDS: { name: string; label: string; required?: boolean; kind?: "date" | "text"; hint?: string }[] = [
  { name: "Week Ending", label: "Week ending", kind: "date", required: true, hint: "Tap the box to open a calendar and pick the last day of the week these numbers cover." },
  { name: "Net Sales", label: "Net sales ($)", required: true },
  { name: "Sales Target", label: "Sales target ($)" },
  { name: "Same Week LY Sales", label: "Same week last year ($)" },
  { name: "Orders", label: "Orders" },
  { name: "Labor Hours", label: "Labor hours" },
  { name: "Labor Cost", label: "Labor cost ($)" },
  { name: "Add-on Orders", label: "Orders with an add-on" },
  { name: "Refund Amount", label: "Refunds ($)" },
  { name: "Void Amount", label: "Voids ($)" },
  { name: "Corporate / Online Sales", label: "Corporate / online sales ($)" },
  { name: "Eligible Orders", label: "Eligible orders (optional)" },
  { name: "Completed Orders", label: "Completed orders (optional)" },
  { name: "Notes", label: "Notes for this week", kind: "text" },
];

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

// The same form adds a week and edits one. Editing sends only the fields that changed.
function WeekForm({ initial, taken, onAdd, onUpdate, onClose }: {
  /** The week being edited; leave out to add a new one. */
  initial?: WeekMetrics;
  /** Week-ending times already used by OTHER weeks: a week can't be entered twice. */
  taken: number[];
  onAdd: (row: Record<string, string>) => Promise<void>;
  onUpdate: (id: string, changes: Record<string, string>) => Promise<void>;
  onClose: () => void;
}) {
  const base = useMemo(() => {
    const v: Record<string, string> = {};
    if (initial) {
      for (const f of WEEK_FIELDS) v[f.name] = (initial.row[f.name] || "").trim();
      v["Week Ending"] = isoDay(initial.weekEnding);
    }
    return v;
  }, [initial]);
  const [values, setValues] = useState<Record<string, string>>(base);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => setValues(v => ({ ...v, [name]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError("");
    const week = parseDate(values["Week Ending"]);
    if (!week) return setError("Choose the week-ending date.");
    if (taken.includes(week.getTime())) {
      return setError(`Week ending ${dateLabelYear(week)} is already entered. Pick that week in the list and press Edit to change it.`);
    }
    for (const f of WEEK_FIELDS) {
      const v = (values[f.name] || "").trim();
      if (f.required && !v) return setError(`${f.label} is required.`);
      if (v && f.kind !== "text" && f.kind !== "date" && parseNum(v) === null) return setError(`${f.label} must be a number.`);
    }
    const row: Record<string, string> = {};
    for (const f of WEEK_FIELDS) row[f.name] = (values[f.name] || "").trim();
    row["Week Ending"] = isoDay(week);
    setSaving(true);
    try {
      if (initial) {
        const changes = Object.fromEntries(Object.entries(row).filter(([k, v]) => v !== (base[k] ?? "")));
        if (!Object.keys(changes).length) {
          setError("Nothing was changed.");
          return;
        }
        await onUpdate(initial.id, changes);
      } else {
        await onAdd(row);
      }
      onClose();
    } catch {
      // the page already showed an error toast; keep the form open with what was typed
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      {WEEK_FIELDS.map(f => (
        <label key={f.name} className={f.kind === "text" ? "full" : undefined}>
          <span>{f.label}{f.required && <span aria-hidden="true"> *</span>}</span>
          <input
            type={f.kind === "date" ? "date" : "text"}
            inputMode={f.kind ? undefined : "decimal"}
            value={values[f.name] || ""}
            onChange={set(f.name)}
            required={f.required}
            placeholder={f.kind ? undefined : "0"}
          />
          {f.hint && <small className="sub">{f.hint}</small>}
        </label>
      ))}
      <p className="sub full" style={{ margin: "-4px 0 0" }}>* Required. Everything else can be filled in later.</p>
      {error && <p className="form-error full" role="alert">{error}</p>}
      <div className="edit-actions">
        <button className="btn" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        <button className={`btn primary${saving ? " is-pending" : ""}`} type="submit" disabled={saving} aria-busy={saving}>
          {saving && <span className="spinner" aria-hidden="true" />}
          {saving ? "Saving…" : initial ? "Save changes" : "Add week"}
        </button>
      </div>
    </form>
  );
}

// A dialog over the page, so Add/Edit works from wherever you are in a long list. Esc closes it,
// Tab stays inside it, and focus goes back to the button that opened it.
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const card = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    document.addEventListener("keydown", onKey);
    card.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = scroll;
      opener?.focus?.();
    };
  }, []);
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const items = card.current?.querySelectorAll<HTMLElement>("input, select, textarea, button:not([disabled])");
    if (!items?.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  return (
    <div className="modal-overlay">
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title} ref={card} onKeyDown={trapTab}>
        <div className="modal-head">
          <h2 className="section-title" style={{ margin: 0 }}>{title}</h2>
          <button type="button" className="btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Previous / next / any week: a dropdown holds every week (newest first, grouped by year, with its sales
// beside the date so a wrong entry stands out), so it works for 3 weeks or 300.
function WeekPicker({ weeks, idx, onPick }: { weeks: WeekMetrics[]; idx: number; onPick: (time: number) => void }) {
  const years = weekYears(weeks);
  const newestFirst = [...weeks].reverse();
  const option = (w: WeekMetrics) => (
    <option key={w.weekEnding.getTime()} value={w.weekEnding.getTime()}>
      {dateLabelYear(w.weekEnding)}{w.netSales !== null ? ` · ${formatValue("money0", w.netSales)}` : ""}
    </option>
  );
  return (
    <div className="week-picker" role="group" aria-label="Choose a week">
      <button type="button" className="btn" aria-label="Previous week (older)" disabled={idx <= 0} onClick={() => onPick(weeks[idx - 1].weekEnding.getTime())}>‹</button>
      <select aria-label="Week ending" value={weeks[idx].weekEnding.getTime()} onChange={e => onPick(Number(e.target.value))}>
        {years.length > 1
          ? years.map(y => <optgroup key={y} label={String(y)}>{newestFirst.filter(w => w.weekEnding.getUTCFullYear() === y).map(option)}</optgroup>)
          : newestFirst.map(option)}
      </select>
      <button type="button" className="btn" aria-label="Next week (newer)" disabled={idx >= weeks.length - 1} onClick={() => onPick(weeks[idx + 1].weekEnding.getTime())}>›</button>
      {idx < weeks.length - 1 && <button type="button" className="btn" onClick={() => onPick(weeks[weeks.length - 1].weekEnding.getTime())}>Latest</button>}
    </div>
  );
}

const PAGE = 12;

// Every week, newest first. Shows 12 at a time with "show more", can be narrowed to one year, and flags weeks
// that were skipped, so it stays quick to scan however long the history gets. Edit and Delete are always visible.
function WeeksList({ weeks, selected, onView, onEdit, onDelete, busy }: {
  weeks: WeekMetrics[];
  selected: number;
  onView: (w: WeekMetrics) => void;
  onEdit: (w: WeekMetrics) => void;
  onDelete: (w: WeekMetrics) => void;
  busy: boolean;
}) {
  const [year, setYear] = useState<number | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const years = weekYears(weeks);
  const newestFirst = useMemo(() => [...weeks].reverse(), [weeks]);
  const gaps = useMemo(() => {
    const m = new Map<number, { count: number; prev: Date }>();
    weeks.forEach((w, i) => {
      const count = i ? missingWeeks(weeks[i - 1].weekEnding, w.weekEnding) : 0;
      if (count) m.set(w.weekEnding.getTime(), { count, prev: weeks[i - 1].weekEnding });
    });
    return m;
  }, [weeks]);
  const rows = year === null ? newestFirst : newestFirst.filter(w => w.weekEnding.getUTCFullYear() === year);
  const visible = rows.slice(0, limit);
  const left = rows.length - visible.length;
  const pickYear = (y: number | null) => { setYear(y); setLimit(PAGE); };

  return (
    <section className="card wk-list" aria-label="All weeks" style={{ marginBottom: 12 }}>
      <div className="list-toolbar">
        <h2 className="section-title" style={{ margin: 0 }}>All weeks <span className="sub">· {weeks.length} entered, newest first</span></h2>
        {years.length > 1 && (
          <div className="chips" role="group" aria-label="Filter by year">
            <button type="button" className={`chip sm ${year === null ? "selected" : ""}`} aria-pressed={year === null} onClick={() => pickYear(null)}>All years</button>
            {years.map(y => <button type="button" key={y} className={`chip sm ${year === y ? "selected" : ""}`} aria-pressed={year === y} onClick={() => pickYear(y)}>{y}</button>)}
          </div>
        )}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="wk-table">
          <thead>
            <tr>
              <th scope="col">Week ending</th><th scope="col">Net sales</th><th scope="col" className="wk-vs-col">vs target</th>
              <th scope="col" className="wk-opt">Orders</th><th scope="col" className="wk-opt">Labor %</th><th scope="col" className="wk-opt">Avg ticket</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {visible.map(w => {
              const time = w.weekEnding.getTime();
              const label = dateLabelYear(w.weekEnding);
              const gap = gaps.get(time);
              const vs = w.targetVarPct === null ? "—" : `${signed(w.targetVarPct * 100, 1)}%`; // on phones this sits under the sales figure
              return (
                <Fragment key={time}>
                  <tr className={time === selected ? "is-selected" : undefined} aria-current={time === selected ? "true" : undefined}>
                    <th scope="row"><button type="button" className="link-button wk-date" aria-label={`View week ending ${label}`} onClick={() => onView(w)}>{label}</button></th>
                    <td>{formatValue("money0", w.netSales)}<small className="wk-vs-inline">{vs} vs target</small></td>
                    <td className="wk-vs-col">{vs}</td>
                    <td className="wk-opt">{formatValue("count", w.orders)}</td>
                    <td className="wk-opt">{formatValue("pct1", w.laborPct)}</td>
                    <td className="wk-opt">{formatValue("money2", w.avgTicket)}</td>
                    <td className="wk-act">
                      <button type="button" className="link-button" aria-label={`Edit week ending ${label}`} disabled={busy} onClick={() => onEdit(w)}>Edit</button>{" "}
                      <button type="button" className="link-button danger" aria-label={`Delete week ending ${label}`} disabled={busy} onClick={() => onDelete(w)}>Delete</button>
                    </td>
                  </tr>
                  {gap && (
                    <tr className="wk-gap">
                      <td colSpan={7}>⚠ {gap.count} week{gap.count > 1 ? "s" : ""} not entered between {dateLabel(gap.prev)} and {dateLabel(w.weekEnding)}</td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!visible.length && <tr><td colSpan={7} className="sub">No weeks in {year}.</td></tr>}
          </tbody>
        </table>
      </div>
      {(left > 0 || rows.length > PAGE) && (
        <div className="wk-more">
          {left > 0 && <button type="button" className="btn" onClick={() => setLimit(l => l + PAGE)}>Show {Math.min(PAGE, left)} more</button>}
          {left > PAGE && <button type="button" className="link-button" onClick={() => setLimit(rows.length)}>Show all {rows.length}</button>}
          {left <= 0 && rows.length > PAGE && <button type="button" className="link-button" onClick={() => setLimit(PAGE)}>Show fewer</button>}
          <span className="sub">Showing {visible.length} of {rows.length}</span>
        </div>
      )}
    </section>
  );
}

const RANGES = [{ n: 8, label: "8 wks" }, { n: 13, label: "13 wks" }, { n: 26, label: "26 wks" }, { n: 0, label: "All" }];

type Editor = { mode: "add" } | { mode: "edit"; week: WeekMetrics };

export function EdibleScorecard({ weekly, targets, ksiReview, onAdd, onUpdate, onDelete }: {
  weekly: SheetRow[];
  targets: SheetRow[];
  ksiReview: SheetRow[];
  /** Save a new week (the page shows the success/failure toast, and throws on failure). */
  onAdd: (row: Record<string, string>) => Promise<void>;
  /** Save changes to a week, found by its stored Week Ending value. */
  onUpdate: (id: string, changes: Record<string, string>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const weeks = useMemo(() => weeklySeries(weekly), [weekly]);
  const [pickedTime, setPickedTime] = useState<number | null>(null); // a week-ending time; null = the latest week
  const [editor, setEditor] = useState<Editor | null>(null);
  const [range, setRange] = useState(13);
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now()); // read once, so rendering stays pure
  const head = useRef<HTMLElement>(null);
  const found = pickedTime === null ? -1 : weeks.findIndex(w => w.weekEnding.getTime() === pickedTime);
  const idx = found >= 0 ? found : weeks.length - 1;
  const week = weeks[idx];
  const previous = idx > 0 ? weeks[idx - 1] : null;
  const tiles = useMemo(() => (week ? scorecard(week, previous, targets) : []), [week, previous, targets]);
  const flagged = useMemo(() => attention(tiles), [tiles]);

  const view = (w: WeekMetrics) => {
    setPickedTime(w.weekEnding.getTime());
    head.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };
  const remove = async (w: WeekMetrics) => {
    const sales = w.netSales !== null ? ` (net sales ${formatValue("money0", w.netSales)})` : "";
    if (!confirm(`Delete the week ending ${dateLabelYear(w.weekEnding)}${sales}? This cannot be undone.`)) return;
    const at = weeks.findIndex(x => x.id === w.id);
    const neighbour = weeks[at - 1] ?? weeks[at + 1] ?? null;
    setBusy(true);
    try {
      await onDelete(w.id);
      if (w.weekEnding.getTime() === week?.weekEnding.getTime()) setPickedTime(neighbour ? neighbour.weekEnding.getTime() : null);
    } catch {
      // the page already showed an error toast
    } finally {
      setBusy(false);
    }
  };

  const editing = editor?.mode === "edit" ? editor.week : undefined;
  const modal = editor && (
    <Modal title={editing ? `Edit week ending ${dateLabelYear(editing.weekEnding)}` : "Add a week"} onClose={() => setEditor(null)}>
      <WeekForm
        key={editing ? editing.id : "add"}
        initial={editing}
        taken={weeks.filter(w => w.id !== editing?.id).map(w => w.weekEnding.getTime())}
        onAdd={async row => {
          await onAdd(row);
          const added = parseDate(row["Week Ending"]);
          if (added) setPickedTime(added.getTime());
        }}
        onUpdate={async (id, changes) => {
          await onUpdate(id, changes);
          const moved = parseDate(changes["Week Ending"]);
          setPickedTime(moved ? moved.getTime() : editing ? editing.weekEnding.getTime() : null);
        }}
        onClose={() => setEditor(null)}
      />
    </Modal>
  );

  if (!week) {
    return (
      <>
        <section className="card" style={{ marginBottom: 16 }}>
          <div className="list-toolbar">
            <h2 className="section-title" style={{ margin: 0 }}>Store scorecard</h2>
            <button type="button" className="btn primary" onClick={() => setEditor({ mode: "add" })}>＋ Add first week</button>
          </div>
          <p className="sub" style={{ margin: 0 }}>No weekly numbers yet. Add the first week (net sales, orders, labor and so on) and this scorecard fills in: status against your targets, what needs attention, and the sales trend.</p>
        </section>
        <div className="viz-grid"><KsiReview rows={ksiReview} /></div>
        {modal}
      </>
    );
  }

  const daysOld = Math.floor((now - week.weekEnding.getTime()) / 86400000);
  const stale = idx === weeks.length - 1 && daysOld > 10;
  const withSales = weeks.filter(w => w.netSales !== null);
  const shown = range > 0 && withSales.length > range ? withSales.slice(-range) : withSales;
  const hasTargets = shown.length > 0 && shown.every(w => w.salesTarget !== null);
  const kFmt = (v: number) => (v >= 1000 ? `$${+(v / 1000).toFixed(1)}K` : `$${v}`);

  return (
    <>
      <section className="card score-head" style={{ marginBottom: 12 }} ref={head}>
        <div className="list-toolbar" style={{ marginBottom: 6 }}>
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>Store scorecard · Week ending {dateLabelYear(week.weekEnding)}</h2>
            {stale && (
              <p className="sub score-stale">
                This is {daysOld} days old — <button type="button" className="link-button" onClick={() => setEditor({ mode: "add" })}>add the latest week</button>.
              </p>
            )}
          </div>
          <div className="week-tools">
            <WeekPicker weeks={weeks} idx={idx} onPick={time => setPickedTime(time)} />
            <button type="button" className="btn" disabled={busy} onClick={() => setEditor({ mode: "edit", week })}>Edit</button>
            <button type="button" className="btn danger" disabled={busy} onClick={() => remove(week)}>Delete</button>
            <button type="button" className="btn primary" onClick={() => setEditor({ mode: "add" })}>＋ Add week</button>
          </div>
        </div>
        {week.notes && <p className="sub" style={{ margin: 0 }}>Note from the team: {week.notes}</p>}
      </section>

      <div className="score-grid">{tiles.map(t => <ScoreTile key={t.key} tile={t} />)}</div>

      <div className="viz-grid">
        <ChartCard
          className="viz-hero"
          title="Needs attention"
          note="Biggest misses against target, worst first"
          table={(
            <table>
              <thead><tr><th>KPI</th><th>This week</th><th>Target</th><th>Status</th></tr></thead>
              <tbody>{tiles.map(t => <tr key={t.key}><th scope="row">{t.label}</th><td>{t.valueText}</td><td>{t.targetText || "—"}</td><td>{STATUS_LABEL[t.status]}</td></tr>)}</tbody>
            </table>
          )}
        >
          {flagged.length ? (
            <ol className="attn-list">
              {flagged.map(f => <li key={f.key}>{f.text}</li>)}
            </ol>
          ) : (
            <Empty>Nothing is off track this week.</Empty>
          )}
          <p className="sub" style={{ margin: "14px 0 0" }}>
            Status uses the green/yellow thresholds in “Targets &amp; definitions” when set. A KPI with only a target is On track when it meets it and Watch when it falls short. Net sales is judged against the target entered for that week (within 10% is Watch).
          </p>
        </ChartCard>

        <TrendChart
          className="viz-wide"
          title="Net sales vs target"
          note={range > 0 && withSales.length > range ? `Latest ${range} of ${withSales.length} weeks` : "Weekly, as entered"}
          actions={withSales.length > 8 ? (
            <div className="chips" role="group" aria-label="Chart range">
              {RANGES.map(r => <button type="button" key={r.n} className={`chip sm ${range === r.n ? "selected" : ""}`} aria-pressed={range === r.n} onClick={() => setRange(r.n)}>{r.label}</button>)}
            </div>
          ) : undefined}
          labels={shown.map(w => dateLabel(w.weekEnding))}
          tipTitles={shown.map(w => `Week ending ${dateLabelYear(w.weekEnding)}`)}
          series={[
            { key: "sales", label: "Net sales", color: "var(--series-1)", values: shown.map(w => w.netSales ?? 0) },
            ...(hasTargets ? [{ key: "target", label: "Target", color: "var(--series-2)", values: shown.map(w => w.salesTarget ?? 0) }] : []),
          ]}
          formatValue={v => formatValue("money0", v)}
          formatTick={kFmt}
          tableLabel="Week ending"
          ariaLabel="Net sales against weekly target"
          empty={shown.length < 2 ? "Add at least two weeks of numbers to see the trend." : undefined}
        />

        <KsiReview rows={ksiReview} />
      </div>

      <WeeksList weeks={weeks} selected={week.weekEnding.getTime()} onView={view} onEdit={w => setEditor({ mode: "edit", week: w })} onDelete={remove} busy={busy} />
      {modal}
    </>
  );
}
