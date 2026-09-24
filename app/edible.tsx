"use client";

import { Fragment, createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { SheetRow } from "@/lib/hq-types";
import {
  CHANNEL_COLUMNS, STATUS_LABEL, actionsForKpi, attention, channelSplit, channelView, formatValue, isoWeekKeyUTC, kpiTag, ksiSummary, missingWeeks,
  numbersLine, openActions, parseDate, parseNum, scorecard, statusCounts, statusRule, weekAfter, weekBefore, weekWarnings, weekYears, weeklySeries, wrapUpDraft,
  type ActionRow, type ChannelRow, type ChannelView, type Status, type Tile, type WeekMetrics,
} from "@/lib/hq-scorecard";
import { ChartCard, Empty, TipBox, TrendChart, useTip } from "./charts";
import { Modal } from "./modal";

// Everything for the Edible - Store numbers, in one place so the tabs work as one system:
//  - <EdibleWorkspace> holds the weeks, targets and open actions and owns the dialogs (add / edit a week, add an
//    action), so the Summary, KPIs and Weekly Closing tabs can all open them without leaving the tab they are on;
//  - the KPIs tab scorecard (with a plain-language explanation of every number), the Summary "store health" panel,
//    and the guided Weekly Closing. The page supplies the saving.

const dateLabel = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
const dateLabelYear = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const monthLabel = (d: Date) => d.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
const signed = (n: number, digits = 0) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(digits)}`;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
/** A due date the sheet reads as a real date ("Fri, Oct 2, 2026"); it displays it in the column's own style. */
const dueText = (iso: string) => {
  const d = parseDate(iso);
  return d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "";
};

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

function ScoreTile({ tile, explained, onExplain }: { tile: Tile; explained: boolean; onExplain: () => void }) {
  const v = STATUS_VIEW[tile.status];
  const target = tile.targetText ? `Target ${tile.targetText}` : tile.status === "context" ? "For context" : "No target set";
  return (
    <article
      className="card score-tile"
      style={{ borderTopColor: v.color }}
      aria-label={`${tile.label}: ${tile.valueText}. ${target}. ${STATUS_LABEL[tile.status]}.`}
    >
      <div className="score-labelrow">
        <span className="score-label">{tile.label}</span>
        <button type="button" className={`score-info${explained ? " on" : ""}`} aria-label={`What does ${tile.label} mean?`} aria-pressed={explained} onClick={onExplain}>i</button>
      </div>
      <strong className="score-value">{tile.valueText}</strong>
      <span className="score-target">{target}</span>
      <div className="score-foot">
        <StatusPill status={tile.status} />
        {tile.change && <small>{tile.change} vs last wk</small>}
      </div>
    </article>
  );
}

// What a number means, how it is worked out and how its colour is decided, in plain words for the people using it.
function ExplainPanel({ tile, onClose }: { tile: Tile; onClose: () => void }) {
  const i = tile.info;
  return (
    <section className="card explain" aria-label={`About ${tile.label}`}>
      <div className="list-toolbar">
        <h3 className="viz-title">About “{tile.label}”</h3>
        <button type="button" className="btn" aria-label="Close explanation" onClick={onClose}>×</button>
      </div>
      <dl className="explain-list">
        <dt>What it means</dt><dd>{i.definition}</dd>
        <dt>How it’s worked out</dt><dd>{i.calculation}</dd>
        {i.source && <><dt>Where it comes from</dt><dd>{i.source}</dd></>}
        <dt>Target</dt><dd>{tile.targetText || "None set yet"}</dd>
        <dt>What the colour means</dt><dd>{statusRule(tile)}</dd>
        {i.owner && <><dt>Who watches it</dt><dd>{i.owner}</dd></>}
        {i.note && <><dt>Note</dt><dd>{i.note}</dd></>}
      </dl>
    </section>
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

// ── The shared workspace ─────────────────────────────────────────────────────

export type NewAction = { description: string; owner: string; due: string; escalate: boolean; kpiLabel: string; why: string };
type ActionContext = { kpiLabel: string; text: string };
type Editor = { mode: "add" } | { mode: "edit"; week: WeekMetrics };

type Workspace = {
  weeks: WeekMetrics[];
  targets: SheetRow[];
  /** The store's still-open work items. */
  actions: ActionRow[];
  now: number;
  /** Index (into `weeks`) of the week being looked at on the KPIs tab: the latest unless someone picked another. */
  idx: number;
  setViewTime: (time: number | null) => void;
  busy: boolean;
  openAddWeek: () => void;
  openEditWeek: (week: WeekMetrics) => void;
  deleteWeek: (week: WeekMetrics) => Promise<void>;
  /** Open the "add an action" dialog; pass the number it answers so the action stays linked to it. */
  openAddAction: (context?: ActionContext) => void;
};
const WorkspaceContext = createContext<Workspace | null>(null);
function useWorkspace(): Workspace {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("Edible components must be rendered inside <EdibleWorkspace>.");
  return ctx;
}

export function EdibleWorkspace({ weekly, targets, workRows, owners, onAddWeek, onUpdateWeek, onDeleteWeek, onCreateAction, children }: {
  weekly: SheetRow[];
  targets: SheetRow[];
  /** The store's rows from the Work sheet (open ones become "actions"). */
  workRows: SheetRow[];
  /** Names to suggest when choosing who does an action. */
  owners: string[];
  /** The page does the saving and shows the success/failure toast; each throws on failure. */
  onAddWeek: (row: Record<string, string>) => Promise<void>;
  onUpdateWeek: (id: string, changes: Record<string, string>) => Promise<void>;
  onDeleteWeek: (id: string) => Promise<void>;
  onCreateAction: (action: NewAction) => Promise<void>;
  children: ReactNode;
}) {
  const weeks = useMemo(() => weeklySeries(weekly), [weekly]);
  const actions = useMemo(() => openActions(workRows), [workRows]);
  const [viewTime, setViewTime] = useState<number | null>(null); // a week-ending time; null = the latest week
  const [editor, setEditor] = useState<Editor | null>(null);
  const [actionFor, setActionFor] = useState<{ context: ActionContext | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now()); // read once, so rendering stays pure
  const found = viewTime === null ? -1 : weeks.findIndex(w => w.weekEnding.getTime() === viewTime);
  const idx = found >= 0 ? found : weeks.length - 1;

  const deleteWeek = async (w: WeekMetrics) => {
    const sales = w.netSales !== null ? ` (net sales ${formatValue("money0", w.netSales)})` : "";
    if (!confirm(`Delete the week ending ${dateLabelYear(w.weekEnding)}${sales}? This cannot be undone.`)) return;
    const at = weeks.findIndex(x => x.id === w.id);
    const neighbour = weeks[at - 1] ?? weeks[at + 1] ?? null;
    setBusy(true);
    try {
      await onDeleteWeek(w.id);
      if (w.weekEnding.getTime() === weeks[idx]?.weekEnding.getTime()) setViewTime(neighbour ? neighbour.weekEnding.getTime() : null);
    } catch {
      // the page already showed an error toast
    } finally {
      setBusy(false);
    }
  };

  const editing = editor?.mode === "edit" ? editor.week : undefined;
  const value: Workspace = {
    weeks, targets, actions, now, idx, setViewTime, busy,
    openAddWeek: () => setEditor({ mode: "add" }),
    openEditWeek: week => setEditor({ mode: "edit", week }),
    deleteWeek,
    openAddAction: context => setActionFor({ context: context ?? null }),
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
      {editor && (
        <Modal title={editing ? `Edit week ending ${dateLabelYear(editing.weekEnding)}` : "Add a week"} onClose={() => setEditor(null)}>
          <WeekForm
            key={editing ? editing.id : "add"}
            initial={editing}
            weeks={weeks}
            now={now}
            onAdd={async row => {
              await onAddWeek(row);
              const added = parseDate(row["Week Ending"]);
              if (added) setViewTime(added.getTime());
            }}
            onUpdate={async (id, changes) => {
              await onUpdateWeek(id, changes);
              const moved = parseDate(changes["Week Ending"]);
              setViewTime(moved ? moved.getTime() : editing ? editing.weekEnding.getTime() : null);
            }}
            onClose={() => setEditor(null)}
          />
        </Modal>
      )}
      {actionFor && (
        <Modal title="Add an action" onClose={() => setActionFor(null)}>
          <ActionForm context={actionFor.context} owners={owners} onCreate={onCreateAction} onClose={() => setActionFor(null)} />
        </Modal>
      )}
    </WorkspaceContext.Provider>
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
  { name: CHANNEL_COLUMNS.direct, label: "Direct store sales ($)", hint: "Sold in the store itself." },
  { name: CHANNEL_COLUMNS.corporate, label: "Corporate sales ($)", hint: "Sold to corporate accounts." },
  { name: CHANNEL_COLUMNS.online, label: "Online sales ($)", hint: "Sold online." },
  { name: "Eligible Orders", label: "Eligible orders (optional)" },
  { name: "Completed Orders", label: "Completed orders (optional)" },
  { name: "Notes", label: "Notes for this week", kind: "text" },
];

// A week entered the older way has one "Corporate / Online" figure. It stays editable, right after the channel boxes, but only for such weeks.
const LEGACY_FIELD = { name: CHANNEL_COLUMNS.combined, label: "Corporate + online together ($, older entry)", hint: "This week was entered as one figure. Type corporate and online above to split it; the boxes above then replace this one." };

function weekFields(initial?: WeekMetrics): typeof WEEK_FIELDS {
  if (!initial || !(initial.row[CHANNEL_COLUMNS.combined] || "").trim()) return WEEK_FIELDS;
  const at = WEEK_FIELDS.findIndex(f => f.name === CHANNEL_COLUMNS.online);
  return [...WEEK_FIELDS.slice(0, at + 1), LEGACY_FIELD, ...WEEK_FIELDS.slice(at + 1)];
}

/** What the typed channel figures mean, worked out as you type: the missing channel, each share of net sales, and the change from last week. */
function ChannelReadout({ values, prev }: { values: Record<string, string>; prev: WeekMetrics | null }) {
  const net = parseNum(values["Net Sales"]);
  const ch = channelSplit(values, net);
  const p = (v: number | null) => formatValue("pct1", v);
  const anyTyped = [CHANNEL_COLUMNS.direct, CHANNEL_COLUMNS.corporate, CHANNEL_COLUMNS.online].some(k => parseNum(values[k]) !== null);
  if (!anyTyped && ch.corpOnline === null) {
    return <p className="sub full channel-live">Type direct store, corporate and online sales. Type any two and the third is worked out for you, with each channel’s share of net sales.</p>;
  }
  const rows = [
    { key: "direct" as const, label: "Direct store", before: prev?.directPct ?? null },
    { key: "corporate" as const, label: "Corporate", before: prev?.corporatePct ?? null },
    { key: "online" as const, label: "Online", before: prev?.onlineOnlyPct ?? null },
  ];
  return (
    <div className="full channel-live" role="status" aria-live="polite">
      <b>Worked out for you{net === null ? " (add net sales to see the percentages)" : ""}</b>
      <ul>
        {rows.map(r => {
          const dollars = ch[r.key];
          const share = dollars !== null && net ? dollars / net : null;
          const pts = share !== null && r.before !== null ? (share - r.before) * 100 : null;
          return (
            <li key={r.key}>
              {r.label}: {dollars === null ? "—" : `${formatValue("money0", dollars)} · ${p(share)}`}
              {ch.derived[r.key] ? " (worked out)" : ""}
              {pts !== null ? ` · ${pts >= 0 ? "+" : "−"}${Math.abs(pts).toFixed(1)} pts vs last week` : ""}
            </li>
          );
        })}
        {!ch.split && ch.corpOnline !== null && <li>Corporate + online together: {formatValue("money0", ch.corpOnline)} · {p(net ? ch.corpOnline / net : null)}</li>}
      </ul>
    </div>
  );
}

// The same form adds a week and edits one. Editing sends only the fields that changed. Nothing is blocked
// for looking odd, but a mistyped digit or numbers that can't all be true are pointed out before saving.
function WeekForm({ initial, weeks, now, onAdd, onUpdate, onClose }: {
  /** The week being edited; leave out to add a new one. */
  initial?: WeekMetrics;
  weeks: WeekMetrics[];
  now: number;
  onAdd: (row: Record<string, string>) => Promise<void>;
  onUpdate: (id: string, changes: Record<string, string>) => Promise<void>;
  onClose: () => void;
}) {
  const others = useMemo(() => weeks.filter(w => w.id !== initial?.id), [weeks, initial]); // a week can't be entered twice
  const fields = useMemo(() => weekFields(initial), [initial]);
  const lastChannelField = fields.some(f => f.name === CHANNEL_COLUMNS.combined) ? CHANNEL_COLUMNS.combined : CHANNEL_COLUMNS.online; // the live readout goes right after the channel boxes
  const base = useMemo(() => {
    const v: Record<string, string> = {};
    if (initial) {
      for (const f of fields) v[f.name] = (initial.row[f.name] || "").trim();
      v["Week Ending"] = isoDay(initial.weekEnding);
    } else {
      v["Week Ending"] = weekAfter(others.length ? others[others.length - 1].weekEnding : null); // the week after the latest one
    }
    return v;
  }, [initial, others, fields]);
  const [values, setValues] = useState<Record<string, string>>(base);
  const [error, setError] = useState("");
  const [shown, setShown] = useState<string[] | null>(null); // warnings currently on screen
  const [ack, setAck] = useState(""); // the values the warnings were shown for; saving the same values again means "save anyway"
  const [saving, setSaving] = useState(false);
  const typedWeek = parseDate(values["Week Ending"]);
  const prev = weekBefore(others, typedWeek);
  const set = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues(v => ({ ...v, [name]: e.target.value }));
    setShown(null);
    setAck(""); // any edit withdraws "save anyway": the warnings are checked afresh
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError("");
    const week = parseDate(values["Week Ending"]);
    if (!week) return setError("Choose the week-ending date.");
    if (others.some(w => w.weekEnding.getTime() === week.getTime())) {
      return setError(`Week ending ${dateLabelYear(week)} is already entered. Pick that week in the list and press Edit to change it.`);
    }
    for (const f of fields) {
      const v = (values[f.name] || "").trim();
      if (f.required && !v) return setError(`${f.label} is required.`);
      if (v && f.kind !== "text" && f.kind !== "date" && parseNum(v) === null) return setError(`${f.label} must be a number.`);
    }
    const key = JSON.stringify(values);
    const warnings = weekWarnings(values, prev, new Date(now));
    if (warnings.length && ack !== key) {
      setShown(warnings);
      setAck(key);
      return;
    }
    const row: Record<string, string> = {};
    for (const f of fields) row[f.name] = (values[f.name] || "").trim();
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
      {fields.map(f => {
        const last = f.kind ? "" : (prev?.row[f.name] || "").trim();
        return (
          <Fragment key={f.name}>
            <label className={f.kind === "text" ? "full" : undefined}>
              <span>{f.label}{f.required && <span aria-hidden="true"> *</span>}</span>
              <input
                type={f.kind === "date" ? "date" : "text"}
                inputMode={f.kind ? undefined : "decimal"}
                value={values[f.name] || ""}
                onChange={set(f.name)}
                required={f.required}
                placeholder={f.kind ? undefined : "0"}
              />
              {f.hint && <small className="sub">{f.hint}{f.kind === "date" && !initial && prev ? ` Suggested: the week after ${dateLabelYear(prev.weekEnding)}.` : ""}</small>}
              {last && <small className="sub">Week before: {last}</small>}
            </label>
            {f.name === lastChannelField && <ChannelReadout values={values} prev={prev} />}
          </Fragment>
        );
      })}
      <p className="sub full" style={{ margin: "-4px 0 0" }}>* Required. Everything else can be filled in later.</p>
      {error && <p className="form-error full" role="alert">{error}</p>}
      {shown && (
        <div className="form-warn full" role="alert">
          <b>Please double-check:</b>
          <ul>{shown.map(w => <li key={w}>{w}</li>)}</ul>
          <small>Fix what’s wrong, or press “Save anyway” if the numbers are right.</small>
        </div>
      )}
      <div className="edit-actions">
        <button className="btn" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        <button className={`btn primary${saving ? " is-pending" : ""}`} type="submit" disabled={saving} aria-busy={saving}>
          {saving && <span className="spinner" aria-hidden="true" />}
          {saving ? "Saving…" : shown ? "Save anyway" : initial ? "Save changes" : "Add week"}
        </button>
      </div>
    </form>
  );
}

// "What will be done about it": who, by when, and (for a number that is off track) which number it answers, so the
// action can be found again from that number. Saved as an ordinary work item for the store.
function ActionForm({ context, owners, onCreate, onClose }: {
  context: ActionContext | null;
  owners: string[];
  onCreate: (action: NewAction) => Promise<void>;
  onClose: () => void;
}) {
  const [v, setV] = useState({ description: "", owner: "", due: "", result: "" });
  const [escalate, setEscalate] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (name: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV(cur => ({ ...cur, [name]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError("");
    if (!v.description.trim()) return setError("Say what will be done.");
    if (!v.owner.trim()) return setError("Say who will do it.");
    setSaving(true);
    try {
      await onCreate({
        description: v.description.trim(),
        owner: v.owner.trim(),
        due: v.due ? dueText(v.due) : "",
        escalate,
        kpiLabel: context?.kpiLabel ?? "",
        why: context ? kpiTag(context.kpiLabel, v.result) : v.result.trim(),
      });
      onClose();
    } catch {
      // the page already showed an error toast; keep the form open with what was typed
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      {context && <p className="sub full ctx-line">For: <b>{context.text}</b></p>}
      <label className="full">
        <span>What will be done? *</span>
        <textarea rows={3} value={v.description} onChange={set("description")} placeholder="e.g. Cut two labor hours from slow afternoons" />
      </label>
      <label>
        <span>Who will do it? *</span>
        <input value={v.owner} onChange={set("owner")} list="edible-owners" placeholder="Name" />
        <datalist id="edible-owners">{owners.map(o => <option key={o} value={o} />)}</datalist>
      </label>
      <label>
        <span>Done by</span>
        <input type="date" value={v.due} onChange={set("due")} />
      </label>
      <label className="full">
        <span>What result do you expect? (optional)</span>
        <input value={v.result} onChange={set("result")} placeholder="e.g. Labor back under 25%" />
      </label>
      <label className="check full">
        <input type="checkbox" checked={escalate} onChange={e => setEscalate(e.target.checked)} />
        <span>This needs Ahmad’s decision <small className="sub">(it will also show on his Home page)</small></span>
      </label>
      {error && <p className="form-error full" role="alert">{error}</p>}
      <div className="edit-actions">
        <button className="btn" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        <button className={`btn primary${saving ? " is-pending" : ""}`} type="submit" disabled={saving} aria-busy={saving}>
          {saving && <span className="spinner" aria-hidden="true" />}
          {saving ? "Saving…" : "Add action"}
        </button>
      </div>
    </form>
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

/** One flagged number: what is wrong, a button to say what will be done, and the actions already answering it. */
function AttentionItem({ label, text, linked, onAction }: { label: string; text: string; linked: ActionRow[]; onAction: () => void }) {
  return (
    <li>
      <div className="attn-line">
        <span>{text}</span>
        <button type="button" className="link-button" aria-label={`Add an action for ${label}`} onClick={onAction}>＋ Action</button>
      </div>
      {linked.map(a => (
        <small className="attn-action" key={a.id}>→ {a.title} · {a.owner || "no owner"} · {a.status || "Open"}</small>
      ))}
    </li>
  );
}

// ── Sales by channel: direct store vs corporate vs online, and how each moved ─────────────────────────────

const pctText = (v: number | null) => formatValue("pct1", v);
const signedMoney = (v: number) => `${v >= 0 ? "+" : "−"}${formatValue("money0", Math.abs(v))}`;
const signedPts = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)} pts`;
const signedPct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(1)}%`;

function ChannelLine({ row }: { row: ChannelRow }) {
  const subtotal = row.key === "corpOnline";
  return (
    <tr className={subtotal ? "chan-sub" : undefined}>
      <th scope="row">{row.label}{row.derived && <small className="sub"> (worked out)</small>}</th>
      <td>{row.dollars === null ? "—" : formatValue("money0", row.dollars)}</td>
      <td>{pctText(row.pct)}</td>
      <td>{row.dollarChange === null ? "—" : <>{signedMoney(row.dollarChange)}{row.dollarChangePct !== null && <small className="sub"> ({signedPct(row.dollarChangePct)})</small>}</>}</td>
      <td>{row.pctChangePts === null ? "—" : signedPts(row.pctChangePts)}</td>
      <td>
        {row.target === null ? "—" : <>{pctText(row.target)}{row.vsTargetPts !== null && <small className={`sub${row.key === "direct" ? (row.vsTargetPts >= 0 ? " chan-good" : " chan-bad") : ""}`}> ({signedPts(row.vsTargetPts)})</small>}</>}
      </td>
    </tr>
  );
}

function ChannelPanel({ week, previous, view, recent }: { week: WeekMetrics; previous: WeekMetrics | null; view: ChannelView; recent: WeekMetrics[] }) {
  const { openEditWeek } = useWorkspace();
  const netChange = week.netSales !== null && previous?.netSales != null ? week.netSales - previous.netSales : null;
  const nothing = view.rows.every(r => r.dollars === null);
  return (
    <section className="card channel-panel" style={{ marginBottom: 12 }} aria-label="Sales by channel">
      <div className="list-toolbar">
        <h2 className="section-title" style={{ margin: 0 }}>Sales by channel · week ending {dateLabelYear(week.weekEnding)}</h2>
        <button type="button" className="btn" onClick={() => openEditWeek(week)}>Edit channel sales</button>
      </div>
      {nothing ? (
        <p className="sub" style={{ margin: 0 }}>No channel sales were entered for this week. Press <b>Edit channel sales</b> and type direct store, corporate and online sales (any two is enough: the third and every percentage are worked out for you).</p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className="channel-table">
              <thead>
                <tr>
                  <th scope="col">Channel</th><th scope="col">Sales</th><th scope="col">% of net sales</th>
                  <th scope="col">{view.previous ? `Change vs ${dateLabel(view.previous)}` : "Change"}</th><th scope="col">Share, points</th><th scope="col">Target share</th>
                </tr>
              </thead>
              <tbody>
                {view.rows.map(r => <ChannelLine key={r.key} row={r} />)}
                <tr className="chan-total">
                  <th scope="row">Net sales</th>
                  <td>{week.netSales === null ? "—" : formatValue("money0", week.netSales)}</td>
                  <td>{week.netSales === null ? "—" : "100%"}</td>
                  <td>{netChange === null ? "—" : <>{signedMoney(netChange)}{week.wow !== null && <small className="sub"> ({signedPct(week.wow)})</small>}</>}</td>
                  <td>—</td><td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
          {view.gap && <p className="sub" style={{ margin: "8px 0 0" }}>{view.gap}</p>}
          {!view.split && <p className="sub" style={{ margin: "6px 0 0" }}>Corporate and online were entered as one figure for this week. Press <b>Edit channel sales</b> and type them separately to split them.</p>}
          {view.weeksBack > 1 && <p className="sub score-stale" style={{ margin: "6px 0 0" }}>Changes are measured against the week ending {view.previous ? dateLabelYear(view.previous) : ""}, {view.weeksBack} weeks earlier: a week in between was not entered.</p>}
        </>
      )}
      {recent.length > 1 && (
        <details className="explain-details">
          <summary>Recent weeks</summary>
          <div style={{ overflowX: "auto" }}>
            <table className="channel-table">
              <thead><tr><th scope="col">Week ending</th><th scope="col">Net sales</th><th scope="col">Direct</th><th scope="col">Corporate</th><th scope="col">Online</th><th scope="col">Corporate + online</th></tr></thead>
              <tbody>
                {[...recent].reverse().map(w => (
                  <tr key={w.id} className={w.id === week.id ? "is-selected" : undefined}>
                    <th scope="row">{dateLabel(w.weekEnding)}</th>
                    <td>{w.netSales === null ? "—" : formatValue("money0", w.netSales)}</td>
                    <td>{pctText(w.directPct)}</td><td>{pctText(w.corporatePct)}</td><td>{pctText(w.onlineOnlyPct)}</td><td>{pctText(w.onlinePct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      <p className="sub" style={{ margin: "8px 0 0" }}>Percentages are each channel’s sales ÷ net sales, worked out automatically. Type any two channels and the third is calculated. Direct store’s target share comes from the “Direct Sales %” row in Targets &amp; definitions.</p>
    </section>
  );
}

// ── KPIs tab ─────────────────────────────────────────────────────────────────

export function EdibleScorecard({ ksiReview, renderAction }: {
  ksiReview: SheetRow[];
  /** How to draw one open action (the page supplies its work-item row, so status changes work right here). */
  renderAction: (row: SheetRow) => ReactNode;
}) {
  const { weeks, targets, actions, now, idx, setViewTime, busy, openAddWeek, openEditWeek, deleteWeek, openAddAction } = useWorkspace();
  const [range, setRange] = useState(13);
  const [explainKey, setExplainKey] = useState<string | null>(null);
  const head = useRef<HTMLElement>(null);
  const week = weeks[idx];
  const previous = idx > 0 ? weeks[idx - 1] : null;
  const tiles = useMemo(() => (week ? scorecard(week, previous, targets) : []), [week, previous, targets]);
  const flagged = useMemo(() => attention(tiles), [tiles]);
  const channels = useMemo(() => (week ? channelView(week, previous, targets) : null), [week, previous, targets]);

  const view = (w: WeekMetrics) => {
    setViewTime(w.weekEnding.getTime());
    head.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  if (!week) {
    return (
      <>
        <section className="card" style={{ marginBottom: 16 }}>
          <div className="list-toolbar">
            <h2 className="section-title" style={{ margin: 0 }}>Store scorecard</h2>
            <button type="button" className="btn primary" onClick={openAddWeek}>＋ Add first week</button>
          </div>
          <p className="sub" style={{ margin: 0 }}>No weekly numbers yet. Add the first week (net sales, orders, labor and so on) and this scorecard fills in: status against your targets, what needs attention, and the sales trend.</p>
        </section>
        <div className="viz-grid"><KsiReview rows={ksiReview} /></div>
      </>
    );
  }

  const explained = tiles.find(t => t.key === explainKey) ?? null;
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
                This is {daysOld} days old — <button type="button" className="link-button" onClick={openAddWeek}>add the latest week</button>.
              </p>
            )}
          </div>
          <div className="week-tools">
            <WeekPicker weeks={weeks} idx={idx} onPick={time => setViewTime(time)} />
            <button type="button" className="btn" disabled={busy} onClick={() => openEditWeek(week)}>Edit</button>
            <button type="button" className="btn danger" disabled={busy} onClick={() => deleteWeek(week)}>Delete</button>
            <button type="button" className="btn primary" onClick={openAddWeek}>＋ Add week</button>
          </div>
        </div>
        {week.notes && <p className="sub" style={{ margin: 0 }}>Note from the team: {week.notes}</p>}
      </section>

      <div className="score-grid">
        {tiles.map(t => <ScoreTile key={t.key} tile={t} explained={explainKey === t.key} onExplain={() => setExplainKey(k => (k === t.key ? null : t.key))} />)}
      </div>
      {explained && <ExplainPanel tile={explained} onClose={() => setExplainKey(null)} />}

      {channels && <ChannelPanel week={week} previous={previous} view={channels} recent={weeks.slice(Math.max(0, idx - 7), idx + 1)} />}

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
              {flagged.map(f => {
                const label = tiles.find(t => t.key === f.key)?.label ?? f.key;
                return <AttentionItem key={f.key} label={label} text={f.text} linked={actionsForKpi(label, actions)} onAction={() => openAddAction({ kpiLabel: label, text: f.text })} />;
              })}
            </ol>
          ) : (
            <Empty>Nothing is off track this week.</Empty>
          )}
          <p className="sub" style={{ margin: "14px 0 0" }}>
            Press the <b>i</b> on any number to see what it means and how its colour is decided. A KPI with only a target is On track when it meets it and Watch when it falls short. Net sales is judged against the target entered for that week (within 10% is Watch).
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
      </div>

      <section className="card" style={{ marginBottom: 12 }} aria-label="Actions in progress">
        <div className="list-toolbar">
          <h2 className="section-title" style={{ margin: 0 }}>Actions in progress <span className="sub">· {actions.length} open</span></h2>
          <button type="button" className="btn" onClick={() => openAddAction()}>＋ Add action</button>
        </div>
        {actions.length ? actions.map(a => (
          <div className="action-wrap" key={a.id}>
            {a.escalated && <span className="badge warn">Needs Ahmad’s decision</span>}
            {renderAction(a.row)}
          </div>
        )) : (
          <p className="sub" style={{ margin: 0 }}>No open actions. When a number is off track, press <b>＋ Action</b> beside it to say who will fix it and by when.</p>
        )}
      </section>

      <div className="viz-grid"><KsiReview rows={ksiReview} /></div>

      <WeeksList weeks={weeks} selected={week.weekEnding.getTime()} onView={view} onEdit={openEditWeek} onDelete={deleteWeek} busy={busy} />
    </>
  );
}

// ── Summary tab: how the store is doing right now ────────────────────────────

const HEALTH_KEYS = ["netSales", "laborPct", "orders", "avgTicket"];

export function StoreHealth({ onOpenKpis }: { onOpenKpis: () => void }) {
  const { weeks, targets, actions, now, openAddWeek, openAddAction } = useWorkspace();
  const latest = weeks[weeks.length - 1];
  const previous = weeks.length > 1 ? weeks[weeks.length - 2] : null;
  const tiles = useMemo(() => (latest ? scorecard(latest, previous, targets) : []), [latest, previous, targets]);
  const flagged = useMemo(() => attention(tiles), [tiles]);
  // Direct store / corporate / online shares (corporate and online together until they are entered separately).
  const channelRows = useMemo(() => {
    if (!latest) return [];
    const v = channelView(latest, previous, targets);
    return v.rows.filter(r => r.pct !== null && (r.key !== "corpOnline" || !v.split));
  }, [latest, previous, targets]);

  if (!latest) {
    return (
      <section className="card store-health" style={{ marginBottom: 16 }}>
        <div className="list-toolbar">
          <h2 className="section-title" style={{ margin: 0 }}>Store health</h2>
          <button type="button" className="btn primary" onClick={openAddWeek}>＋ Add first week</button>
        </div>
        <p className="sub" style={{ margin: 0 }}>No weekly numbers yet. Once the first week is added, this shows how the store is doing at a glance.</p>
      </section>
    );
  }
  const counts = statusCounts(tiles);
  const daysOld = Math.floor((now - latest.weekEnding.getTime()) / 86400000);
  return (
    <section className="card store-health" style={{ marginBottom: 16 }} aria-label="Store health">
      <div className="list-toolbar">
        <h2 className="section-title" style={{ margin: 0 }}>Store health · week ending {dateLabelYear(latest.weekEnding)}</h2>
        <button type="button" className="btn" onClick={onOpenKpis}>Open the KPIs →</button>
      </div>
      {daysOld > 10 && (
        <p className="sub score-stale">
          These numbers are {daysOld} days old — <button type="button" className="link-button" onClick={openAddWeek}>enter the latest week</button>.
        </p>
      )}
      <div className="health-counts" aria-label="How many numbers are on track">
        {(["off", "watch", "on"] as const).map(s => (
          <span className="health-count" key={s}>
            <span className="score-dot" style={{ background: STATUS_VIEW[s].color, color: STATUS_VIEW[s].ink }} aria-hidden="true">{STATUS_VIEW[s].glyph}</span>
            <b>{counts[s]}</b> {STATUS_LABEL[s].toLowerCase()}
          </span>
        ))}
      </div>
      <div className="health-grid">
        {HEALTH_KEYS.map(k => tiles.find(t => t.key === k)).filter((t): t is Tile => Boolean(t)).map(t => (
          <div className="health-stat" key={t.key} style={{ borderTopColor: STATUS_VIEW[t.status].color }}>
            <span className="score-label">{t.label}</span>
            <strong>{t.valueText}</strong>
            <StatusPill status={t.status} />
          </div>
        ))}
      </div>
      {channelRows.length > 0 && (
        <p className="channel-line" aria-label="Sales by channel">
          <b>Sales by channel:</b>{" "}
          {channelRows.map(r => (
            <span className="channel-chip" key={r.key}>
              {r.label.replace(" (not split yet)", "").replace(" together", "")} <b>{pctText(r.pct)}</b>
              {r.pctChangePts !== null && <small className="sub"> ({signedPts(r.pctChangePts)})</small>}
            </span>
          ))}
        </p>
      )}
      <h3 className="viz-title" style={{ margin: "12px 0 4px" }}>Needs attention</h3>
      {flagged.length ? (
        <ol className="attn-list">
          {flagged.map(f => {
            const label = tiles.find(t => t.key === f.key)?.label ?? f.key;
            return <AttentionItem key={f.key} label={label} text={f.text} linked={actionsForKpi(label, actions)} onAction={() => openAddAction({ kpiLabel: label, text: f.text })} />;
          })}
        </ol>
      ) : (
        <p className="sub" style={{ margin: 0 }}>Nothing is off track this week.</p>
      )}
    </section>
  );
}

// ── Weekly Closing: numbers -> what they say -> actions -> wrap-up ───────────

type WrapFields = { wins: string; misses: string; blockers: string; next: string };
const NO_FIELDS: WrapFields = { wins: "", misses: "", blockers: "", next: "" };

export function CloseTheWeek({ wraps, onSave }: {
  /** Wrap-ups already saved for this store (to say when the week being closed already has one). */
  wraps: SheetRow[];
  /** Save a note under this ISO week key (the page shows the toast; throws on failure). */
  onSave: (note: string, weekKey: string) => Promise<void>;
}) {
  const { weeks, targets, actions, now, openAddWeek, openEditWeek, openAddAction } = useWorkspace();
  const [closeTime, setCloseTime] = useState<number | null>(null); // the week being closed; null = the latest
  const [fields, setFields] = useState<WrapFields>(NO_FIELDS);
  const [saving, setSaving] = useState(false);
  const found = closeTime === null ? -1 : weeks.findIndex(w => w.weekEnding.getTime() === closeTime);
  const idx = found >= 0 ? found : weeks.length - 1;
  const week = weeks[idx];
  const previous = idx > 0 ? weeks[idx - 1] : null;
  const tiles = useMemo(() => (week ? scorecard(week, previous, targets) : []), [week, previous, targets]);
  const flagged = useMemo(() => attention(tiles), [tiles]);
  const set = (name: keyof WrapFields) => (e: React.ChangeEvent<HTMLTextAreaElement>) => setFields(f => ({ ...f, [name]: e.target.value }));

  if (!week) {
    return (
      <section className="card close-week" style={{ marginBottom: 16 }}>
        <div className="list-toolbar">
          <h2 className="section-title" style={{ margin: 0 }}>Close the week</h2>
          <button type="button" className="btn primary" onClick={openAddWeek}>＋ Add first week</button>
        </div>
        <p className="sub" style={{ margin: 0 }}>Start by entering the week’s numbers. Then this page walks through what they say, what is being done about it, and the wrap-up.</p>
      </section>
    );
  }

  const weekKey = isoWeekKeyUTC(week.weekEnding);
  const weekText = dateLabelYear(week.weekEnding);
  const daysOld = Math.floor((now - week.weekEnding.getTime()) / 86400000);
  const stale = idx === weeks.length - 1 && daysOld > 10;
  const counts = statusCounts(tiles);
  const already = wraps.filter(w => w["Source ID"] === weekKey);
  const empty = !Object.values(fields).some(v => v.trim());
  const sales = tiles.find(t => t.key === "netSales");

  const save = async () => {
    if (saving || empty) return;
    const parts = ([["Wins", fields.wins], ["Misses", fields.misses], ["Blockers", fields.blockers], ["Next week", fields.next]] as const)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `${k}: ${v.trim()}`);
    setSaving(true);
    try {
      await onSave([numbersLine(week, tiles, weekText), ...parts].join("\n"), weekKey);
      setFields(NO_FIELDS);
    } catch {
      // the page already showed an error toast; keep what was typed
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card close-week" style={{ marginBottom: 16 }} aria-label="Close the week">
      <div className="list-toolbar">
        <h2 className="section-title" style={{ margin: 0 }}>Close the week</h2>
        <select aria-label="Week to close" value={week.weekEnding.getTime()} onChange={e => setCloseTime(Number(e.target.value))}>
          {[...weeks].reverse().map(w => (
            <option key={w.weekEnding.getTime()} value={w.weekEnding.getTime()}>Week ending {dateLabelYear(w.weekEnding)}{w.netSales !== null ? ` · ${formatValue("money0", w.netSales)}` : ""}</option>
          ))}
        </select>
      </div>

      <div className="close-step">
        <h3><span className="step-num">1</span> The numbers</h3>
        {stale && <p className="sub score-stale">Your latest numbers are {daysOld} days old — <button type="button" className="link-button" onClick={openAddWeek}>enter the latest week</button> before closing.</p>}
        <p className="sub" style={{ margin: 0 }}>
          Week ending {weekText}: net sales <b>{sales?.valueText ?? "—"}</b>{week.targetVarPct !== null ? ` (${signed(week.targetVarPct * 100, 1)}% vs target)` : ""}.{" "}
          <button type="button" className="link-button" onClick={() => openEditWeek(week)}>Edit these numbers</button> · <button type="button" className="link-button" onClick={openAddWeek}>＋ Add another week</button>
        </p>
      </div>

      <div className="close-step">
        <h3><span className="step-num">2</span> What the numbers say</h3>
        <p className="sub" style={{ margin: "0 0 6px" }}><b>{counts.off}</b> off track · <b>{counts.watch}</b> watch · <b>{counts.on}</b> on track</p>
        {flagged.length ? (
          <ol className="attn-list">
            {flagged.map(f => {
              const label = tiles.find(t => t.key === f.key)?.label ?? f.key;
              return <AttentionItem key={f.key} label={label} text={f.text} linked={actionsForKpi(label, actions)} onAction={() => openAddAction({ kpiLabel: label, text: f.text })} />;
            })}
          </ol>
        ) : <p className="sub" style={{ margin: 0 }}>Nothing is off track this week.</p>}
      </div>

      <div className="close-step">
        <h3><span className="step-num">3</span> What is being done about it</h3>
        <p className="sub" style={{ margin: "0 0 6px" }}>{actions.length} open action{actions.length === 1 ? "" : "s"}. <button type="button" className="link-button" onClick={() => openAddAction()}>＋ Add an action</button></p>
        {actions.slice(0, 6).map(a => (
          <div className="mini-row" key={a.id}>
            <b>{a.title}</b>
            <small>{[a.owner || "no owner", a.due && `due ${a.due}`, a.status || "Open"].filter(Boolean).join(" · ")}{a.escalated ? " · needs Ahmad’s decision" : ""}{a.blocked ? " · blocked" : ""}</small>
          </div>
        ))}
        {actions.length > 6 && <p className="sub" style={{ margin: "4px 0 0" }}>…and {actions.length - 6} more in the KPIs tab.</p>}
      </div>

      <div className="close-step">
        <h3><span className="step-num">4</span> Wrap-up · {weekKey}</h3>
        <p className="sub" style={{ margin: "0 0 8px" }}>
          <button type="button" className="btn" onClick={() => setFields(wrapUpDraft(tiles, flagged, actions))}>Fill in from the numbers and actions</button>{" "}
          It writes a first draft you can change. The week’s headline numbers are saved with the wrap-up.
        </p>
        {already.length > 0 && <p className="sub" style={{ margin: "0 0 8px" }}>A wrap-up for {weekKey} was already saved{already[0].Timestamp ? ` on ${new Date(already[0].Timestamp).toLocaleDateString()}` : ""}. Saving adds another.</p>}
        <div className="form-grid">
          <label className="full"><span>Wins — what went well</span><textarea rows={4} value={fields.wins} onChange={set("wins")} placeholder="Numbers on track, tasks finished, good news…" /></label>
          <label className="full"><span>Misses — what slipped</span><textarea rows={4} value={fields.misses} onChange={set("misses")} placeholder="What missed target, and why?" /></label>
          <label className="full"><span>Blockers — what’s in the way</span><textarea rows={4} value={fields.blockers} onChange={set("blockers")} placeholder="Anything that needs a decision or help" /></label>
          <label className="full"><span>Next week’s priorities</span><textarea rows={4} value={fields.next} onChange={set("next")} placeholder="The 2–3 things that matter most next week" /></label>
          <button type="button" className={`btn primary${saving ? " is-pending" : ""}`} disabled={empty || saving} aria-busy={saving} onClick={save}>
            {saving && <span className="spinner" aria-hidden="true" />}
            {saving ? "Saving…" : `Save ${weekKey} wrap-up`}
          </button>
        </div>
      </div>
    </section>
  );
}
