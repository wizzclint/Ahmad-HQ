"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { HqBootstrap, SheetRow } from "@/lib/hq-types";
import { functions } from "@/lib/hq-types";

type View =
  | "home" | "work" | "operate" | "manage" | "close" | "intel"
  | "customers" | "decisions" | "add"
  | "store" | "gardenia" | "finance"
  | "property" | "people" | "personal" | "iron"
  | "firefliesLegacy" | "custom" | "newSheet";

const emptyData: HqBootstrap = {
  work: [], controls: [], user: "", generatedAt: "", source: "demo",
  targets: [], budgets: [], customers: [], customerIssues: [], customerFollowup: [],
  reviews: [], decisions: [], exceptions: [], plans: [], people: [], ksi: [],
  gardeniaPipeline: [], gardeniaProduct: [], gardeniaTasks: [], checklistDefs: [], checklistRuns: [],
  alerts: [], property: [], financeReg: [], personalReg: [],
  requests: [], training: [], systemAccess: [], periods: [], notes: [], activity: [],
  firefliesLegacy: [], ironTasks: [], customSheetDefs: [], customSheets: {},
};

// ── Feedback layer ───────────────────────────────────────────────────────
// Every action gets visible confirmation: a toast when it finishes (or fails),
// a thin progress bar while any request is in flight, and buttons that
// disable + show a spinner while their own action runs so nobody clicks twice.
// Module-level on purpose, so child components and the page's handlers can
// all call notify()/tracked() without prop threading.
type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; text: string };
let toastSeq = 0;
const toastListeners = new Set<(t: ToastItem) => void>();
function notify(text: string, kind: ToastKind = "success") {
  const item: ToastItem = { id: ++toastSeq, kind, text };
  toastListeners.forEach(l => l(item));
}

let busyCount = 0;
const busyListeners = new Set<(n: number) => void>();
async function tracked<T>(fn: () => Promise<T>): Promise<T> {
  busyCount++;
  busyListeners.forEach(l => l(busyCount));
  try {
    return await fn();
  } finally {
    busyCount--;
    busyListeners.forEach(l => l(busyCount));
  }
}

function FeedbackHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [busy, setBusy] = useState(0);
  useEffect(() => {
    const onToast = (t: ToastItem) => {
      setToasts(cur => [...cur.slice(-3), t]);
      setTimeout(() => setToasts(cur => cur.filter(x => x.id !== t.id)), t.kind === "error" ? 6000 : 3000);
    };
    toastListeners.add(onToast);
    busyListeners.add(setBusy);
    return () => { toastListeners.delete(onToast); busyListeners.delete(setBusy); };
  }, []);
  return (
    <>
      <div className={`busy-bar ${busy > 0 ? "on" : ""}`} aria-hidden="true" />
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span className="toast-icon">{t.kind === "success" ? "✓" : t.kind === "error" ? "!" : "i"}</span>
            <span className="toast-text">{t.text}</span>
            <button className="toast-close" aria-label="Dismiss" onClick={() => setToasts(cur => cur.filter(x => x.id !== t.id))}>×</button>
          </div>
        ))}
      </div>
    </>
  );
}

// A button for async actions: disables itself and shows a spinner + label
// while the action runs. The action reports its own success/failure toast.
function AsyncButton({ onClick, children, pendingLabel = "Working…", className = "btn", style, disabled }: {
  onClick: () => Promise<unknown> | unknown;
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const handle = async () => {
    if (pending) return;
    setPending(true);
    try {
      await onClick();
    } catch {
      // the action already surfaced its own error toast
    } finally {
      if (mounted.current) setPending(false);
    }
  };
  return (
    <button type="button" className={`${className}${pending ? " is-pending" : ""}`} style={style} disabled={pending || disabled} aria-busy={pending} onClick={handle}>
      {pending && <span className="spinner" aria-hidden="true" />}
      {pending ? pendingLabel : children}
    </button>
  );
}

const closed = (v = "") => /done|complete|closed/i.test(v);

// ── Kanban pipelines ─────────────────────────────────────────────────────
// A pipeline is an ordered list of stages — that order is both the column
// display order and (for stages with a `test`) the match-priority order.
// Exactly one stage per pipeline should omit `test`: that's the default/
// catch-all a status falls into when nothing else matches. Different boards
// can define entirely different pipelines (Gardenia's Fire's board doesn't
// share Work/Fireflies & Legacy's stages) while reusing the same board component.
type PipelineStage = { id: string; label: string; test?: RegExp };
type Pipeline = PipelineStage[];

function bucketFor(status: string | undefined, pipeline: Pipeline): string {
  const s = (status || "").toLowerCase();
  const matched = pipeline.find(stage => stage.test?.test(s));
  return (matched ?? pipeline.find(stage => !stage.test) ?? pipeline[0]).id;
}

// Work items and Fireflies & Legacy share this one — "Blocked" isn't a stage: a
// blocked item just hasn't started yet from the board's point of view, and
// the reason belongs in Reference/Input or Waiting On, not in Status.
const WORK_PIPELINE: Pipeline = [
  { id: "todo", label: "To Do" },
  { id: "inProgress", label: "In Progress", test: /progress/ },
  { id: "inReview", label: "In Review", test: /review/ },
  { id: "completed", label: "Completed", test: /done|complete/ },
];

// Gardenia's Fire gets its own pipeline, matching how that team actually
// wants to track work — a real backlog, a WIP-limited in-progress stage,
// and an explicit review/testing gate before Done.
const GARDENIA_PIPELINE: Pipeline = [
  { id: "backlog", label: "Backlog / To Do" },
  { id: "inProgress", label: "In Progress", test: /progress/ },
  { id: "inReview", label: "In Review / Testing", test: /review|test/ },
  { id: "done", label: "Done", test: /done|complete/ },
];

// Sales pipeline stages, distinct from GARDENIA_PIPELINE's task-tracking
// stages — this tracks prospects/accounts through the actual sales cycle.
const SALES_PIPELINE: Pipeline = [
  { id: "toResearch", label: "To Research" },
  { id: "priority", label: "Priority", test: /priority/ },
  { id: "attempted", label: "Attempted", test: /attempt/ },
  { id: "qualified", label: "Qualified", test: /qualif/ },
  { id: "tastingScheduled", label: "Tasting Scheduled", test: /tasting sched/ },
  { id: "tastingCompleted", label: "Tasting Completed", test: /tasting comp/ },
  { id: "firstOrderWon", label: "First Order Won", test: /first order/ },
  { id: "recurringWon", label: "Recurring Won", test: /recurring/ },
];

// ── Capture / Inbox routing ─────────────────────────────────────────────────
// Where a captured task actually lands depends on which area it's assigned
// to. Areas with their own dedicated task sheet get a real row there (with a
// client-generated ID, since those sheets don't auto-assign one — see
// EditableDataTable's add-row flow); areas without one fall back to the
// generic Work sheet, tagged so it surfaces under that area's Work Items via
// the existing areas[].match filtering.
type CaptureFields = { description: string; assignee: string; due: string; priority: string };
type CaptureRoute =
  | { label: string; kind: "work" }
  | { label: string; kind: "generic"; sheet: string; idPrefix: string; buildRow: (f: CaptureFields) => Record<string, string> };

const CAPTURE_ROUTES: Record<string, CaptureRoute> = {
  fireflies: {
    label: "Fireflies & Legacy", kind: "generic", sheet: "HQ_FIREFLIES_LEGACY", idPrefix: "FL",
    buildRow: f => ({ "Clinton Task": f.description, Priority: f.priority, Status: "To Do", Owner: f.assignee }),
  },
  gardenia: {
    label: "Gardenia's Fire", kind: "generic", sheet: "HQ_GARDENIA_TASKS", idPrefix: "GF",
    buildRow: f => ({ Task: f.description, Description: f.description, Priority: f.priority, Status: "Backlog / To Do", Owner: f.assignee, Due: f.due }),
  },
  iron: {
    label: "Iron Marks", kind: "generic", sheet: "HQ_IRONMARK_TASKS", idPrefix: "IM",
    buildRow: f => ({ Task: f.description, Description: f.description, Priority: f.priority, Status: "Backlog / To Do", Owner: f.assignee, Due: f.due }),
  },
  edible: { label: "Edible", kind: "work" },
  finance: { label: "Finance & Office", kind: "work" },
  property: { label: "Property", kind: "work" },
  people: { label: "People & Systems", kind: "work" },
  personal: { label: "Personal / Ahmad", kind: "work" },
};

// ── Area pages ───────────────────────────────────────────────────────────
// Edible - Store, Gardenia's Fire, Finance & Office and Iron Marks share one
// page template (Summary, Tasks, Weekly Closing, KPIs) plus tabs that only
// make sense for that business. Adding a tab to an area = one entry in its
// `tabs` list here plus one case in renderAreaTab().
type AreaTab = { id: string; label: string };
type AreaPage = { title: string; subtitle: string; label: string; business: RegExp; captureKey: string; tabs: AreaTab[] };

const AREA_PAGES: Record<string, AreaPage> = {
  store: {
    title: "Edible - Store", subtitle: "Operations, checklists, customers and the weekly close",
    label: "Edible", business: /edible/i, captureKey: "edible",
    tabs: [
      { id: "summary", label: "Summary" }, { id: "tasks", label: "▤ Tasks" }, { id: "checklists", label: "Checklists" },
      { id: "customers", label: "Customers & Reviews" }, { id: "closing", label: "Weekly Closing" }, { id: "kpi", label: "KPIs" },
    ],
  },
  gardenia: {
    title: "Gardenia's Fire", subtitle: "Sales pipeline, product, customers and the weekly close",
    label: "Gardenia's Fire", business: /gardenia/i, captureKey: "gardenia",
    tabs: [
      { id: "summary", label: "Summary" }, { id: "tasks", label: "▤ Tasks" }, { id: "pipeline", label: "◆ Sales Pipeline" },
      { id: "product", label: "Product & Pricing" }, { id: "customers", label: "Customers & Follow-ups" },
      { id: "closing", label: "Weekly Closing" }, { id: "kpi", label: "KPIs" },
    ],
  },
  finance: {
    title: "Finance & Office", subtitle: "Finance register, budgets and the weekly close",
    label: "Finance & Office", business: /finance/i, captureKey: "finance",
    tabs: [
      { id: "summary", label: "Summary" }, { id: "tasks", label: "▤ Tasks" }, { id: "register", label: "Finance Register" },
      { id: "budgets", label: "Budgets" }, { id: "closing", label: "Weekly Closing" }, { id: "kpi", label: "KPIs" },
    ],
  },
  iron: {
    title: "Iron Marks", subtitle: "Tasks, the weekly close and how the project is tracking",
    label: "Iron Marks", business: /iron/i, captureKey: "iron",
    tabs: [
      { id: "summary", label: "Summary" }, { id: "tasks", label: "▤ Tasks" },
      { id: "closing", label: "Weekly Closing" }, { id: "kpi", label: "KPIs" },
    ],
  },
};

// ISO-8601 week key like "2026-W38" — used to label each weekly wrap-up.
function isoWeekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// The weekly-close wrap-up: four short prompts saved as one note per week.
function WeeklyWrapUpForm({ weekKey, onSave }: { weekKey: string; onSave: (note: string) => Promise<void> }) {
  const [fields, setFields] = useState({ wins: "", misses: "", blockers: "", next: "" });
  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLTextAreaElement>) => setFields(f => ({ ...f, [k]: e.target.value }));
  const empty = !Object.values(fields).some(v => v.trim());
  return (
    <div className="form-grid">
      <label className="full">Wins — what went well<textarea rows={2} value={fields.wins} onChange={set("wins")} placeholder="Orders won, tasks finished, good news…" /></label>
      <label className="full">Misses — what slipped<textarea rows={2} value={fields.misses} onChange={set("misses")} placeholder="What didn't get done, and why?" /></label>
      <label className="full">Blockers — what&apos;s in the way<textarea rows={2} value={fields.blockers} onChange={set("blockers")} placeholder="Anything that needs a decision or help" /></label>
      <label className="full">Next week&apos;s priorities<textarea rows={2} value={fields.next} onChange={set("next")} placeholder="The 2–3 things that matter most next week" /></label>
      <AsyncButton
        className="btn primary"
        pendingLabel="Saving…"
        disabled={empty}
        onClick={async () => {
          const note = ([["Wins", fields.wins], ["Misses", fields.misses], ["Blockers", fields.blockers], ["Next week", fields.next]] as const)
            .filter(([, v]) => v.trim())
            .map(([k, v]) => `${k}: ${v.trim()}`)
            .join("\n");
          await onSave(note);
          setFields({ wins: "", misses: "", blockers: "", next: "" });
        }}
      >
        Save {weekKey} wrap-up
      </AsyncButton>
    </div>
  );
}

// Exactly the given pipeline's stages, always — no escape hatch for a stray
// legacy value to add an extra option. If a row somehow has something else,
// this select just won't show it as selected until it's changed to a real one.
function StatusSelect({ value, onChange, pipeline }: { value: string; onChange: (v: string) => void; pipeline: Pipeline }) {
  const options = pipeline.map(s => s.label);
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", fontSize: "0.82rem", padding: "2px 4px", border: "1px solid #c0c8d8", borderRadius: 3 }}>
      {!options.includes(value) && <option value="">—</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// Quick-glance counts of how many rows fall into each pipeline stage.
function StatusSummary({ rows, pipeline, statusField = "Status" }: { rows: SheetRow[]; pipeline: Pipeline; statusField?: string }) {
  const counts = pipeline.map(stage => rows.filter(r => bucketFor(r[statusField], pipeline) === stage.id).length);
  return (
    <section className="kpis-4">
      {pipeline.map((stage, i) => (
        <Kpi key={stage.id} label={stage.label} value={counts[i]} detail={rows.length ? `${Math.round((counts[i] / rows.length) * 100)}% of ${rows.length}` : "—"} tone="" />
      ))}
    </section>
  );
}

// ── Generic editable data table ───────────────────────────────────────────────
function EditableDataTable({
  rows, sheetName, priorityCols, columns, pipeline = WORK_PIPELINE, statusField = "Status", defaults, onUpdate, onAdd, onDelete,
}: {
  rows: SheetRow[];
  sheetName: string;
  priorityCols?: string[];
  /** Pre-filled values for new rows — used when the table is filtered (e.g. to one business) so a new row doesn't vanish from the view it was added in. */
  defaults?: Record<string, string>;
  /** Explicit header list — needed for a brand-new sheet with zero rows yet, since headers can't be inferred from data. */
  columns?: string[];
  pipeline?: Pipeline;
  /** Which column holds the pipeline stage — defaults to "Status", but boards like Sales Pipeline use "Stage". */
  statusField?: string;
  onUpdate: (sheet: string, id: string, changes: Record<string, string>) => Promise<void>;
  onAdd: (sheet: string, row: Record<string, string>) => Promise<void>;
  onDelete: (sheet: string, id: string) => Promise<void>;
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const allHeaders = columns && columns.length ? columns : (rows.length ? Object.keys(rows[0]) : []);
  const headers = priorityCols
    ? [...priorityCols.filter(h => allHeaders.includes(h)), ...allHeaders.filter(h => !priorityCols.includes(h))]
    : allHeaders;
  const showCols = headers.slice(0, 8);

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditValues({ ...rows[idx] });
  };

  const handleSave = async (idx: number) => {
    setSaving(true);
    try {
      const id = rows[idx][headers[0]]; // first column is the row identifier
      const changes: Record<string, string> = {};
      headers.forEach(h => { if (editValues[h] !== rows[idx][h]) changes[h] = editValues[h] ?? ""; });
      if (Object.keys(changes).length) await onUpdate(sheetName, id, changes);
      setEditingIdx(null);
    } catch {
      // the handler already showed an error toast; leave the editor open so nothing typed is lost
    } finally { setSaving(false); }
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      await onAdd(sheetName, newRow);
      setAdding(false);
      setNewRow({});
    } catch {
      // the handler already showed an error toast; keep the row being typed
    } finally { setSaving(false); }
  };

  const handleDelete = async (idx: number) => {
    const id = rows[idx][headers[0]];
    if (!confirm(`Delete this record${id ? ` (${id})` : ""}? This cannot be undone.`)) return;
    setSaving(true);
    try { await onDelete(sheetName, id); } catch { /* error toast already shown */ } finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr>
              {showCols.map(h => (
                <th key={h} style={{ padding: "6px 10px", background: "#173B5B", color: "#fff", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
              ))}
              <th style={{ padding: "6px 10px", background: "#173B5B", color: "#fff" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 ? "#f8f9fb" : "#fff", borderBottom: "1px solid #e8eaf0" }}>
                {editingIdx === i ? (
                  <>
                    {showCols.map(h => (
                      <td key={h} style={{ padding: "4px 6px" }}>
                        {h === statusField ? (
                          <StatusSelect value={editValues[h] ?? ""} onChange={v => setEditValues(ev => ({ ...ev, [h]: v }))} pipeline={pipeline} />
                        ) : (
                          <input
                            value={editValues[h] ?? ""}
                            onChange={e => setEditValues(v => ({ ...v, [h]: e.target.value }))}
                            style={{ width: "100%", fontSize: "0.82rem", padding: "2px 4px", border: "1px solid #c0c8d8", borderRadius: 3 }}
                          />
                        )}
                      </td>
                    ))}
                    <td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}>
                      <button className="btn primary" style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => handleSave(i)} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button className="link-button" style={{ marginLeft: 6, fontSize: "0.75rem" }} onClick={() => setEditingIdx(null)}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    {showCols.map(h => (
                      <td key={h} style={{ padding: "6px 10px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row[h]}>{row[h] || "—"}</td>
                    ))}
                    <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                      <button className="link-button" style={{ fontSize: "0.75rem" }} onClick={() => startEdit(i)}>Edit</button>
                      <button className="link-button" style={{ fontSize: "0.75rem", marginLeft: 8, color: "#ae493e" }} onClick={() => handleDelete(i)} disabled={saving}>{saving ? "Working…" : "Delete"}</button>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {adding && (
              <tr style={{ background: "#eef4ff", borderBottom: "1px solid #c0c8d8" }}>
                {showCols.map(h => (
                  <td key={h} style={{ padding: "4px 6px" }}>
                    {h === statusField ? (
                      <StatusSelect value={newRow[h] ?? ""} onChange={v => setNewRow(nr => ({ ...nr, [h]: v }))} pipeline={pipeline} />
                    ) : (
                      <input
                        placeholder={h}
                        value={newRow[h] ?? ""}
                        onChange={e => setNewRow(v => ({ ...v, [h]: e.target.value }))}
                        style={{ width: "100%", fontSize: "0.82rem", padding: "2px 4px", border: "1px solid #c0c8d8", borderRadius: 3 }}
                      />
                    )}
                  </td>
                ))}
                <td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}>
                  <button className="btn primary" style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={handleAdd} disabled={saving}>
                    {saving ? "Saving…" : "Add"}
                  </button>
                  <button className="link-button" style={{ marginLeft: 6, fontSize: "0.75rem" }} onClick={() => { setAdding(false); setNewRow({}); }}>Cancel</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
        <p className="sub" style={{ margin: 0 }}>{rows.length} record{rows.length !== 1 ? "s" : ""}{headers.length > 8 ? ` · ${headers.length - 8} more columns hidden` : ""}</p>
        {!adding && <button className="btn" style={{ fontSize: "0.78rem", padding: "3px 10px" }} onClick={() => { setNewRow({ ...defaults }); setAdding(true); }}>＋ Add row</button>}
      </div>
    </div>
  );
}

// ── Create a new register sheet from the app ──────────────────────────────
function NewSheetForm({ onCreate }: { onCreate: (label: string, columns: string[]) => Promise<string | null> }) {
  const [label, setLabel] = useState("");
  const [columnsText, setColumnsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const columns = columnsText.split(",").map(c => c.trim()).filter(Boolean);
    if (!label.trim()) { setError("Give the sheet a name."); return; }
    if (!columns.length) { setError("List at least one column."); return; }
    setSaving(true);
    setError("");
    try {
      const name = await onCreate(label.trim(), columns);
      if (name) { setLabel(""); setColumnsText(""); }
      else setError("Could not create the sheet — it may already exist, or the name didn't produce a valid sheet name.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label className="full">Register name<input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Marketing Campaigns" required /></label>
      <label className="full">
        Columns (comma-separated)
        <input value={columnsText} onChange={e => setColumnsText(e.target.value)} placeholder="e.g. Campaign, Channel, Budget, Status, Owner, Due" required />
      </label>
      {error && <p className="sub full" style={{ color: "#ae493e", margin: 0 }}>{error}</p>}
      <button className="btn primary full" type="submit" disabled={saving} style={{ justifySelf: "start" }}>
        {saving ? "Creating…" : "＋ Create register"}
      </button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  );
}

function Badge({ value }: { value?: string }) {
  return <span className="status-pill">{value || "—"}</span>;
}

function WorkRow({ row, onSave, onDelete }: { row: SheetRow; onSave: (u: SheetRow) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [update, setUpdate] = useState<SheetRow>({ id: row.ID, type: "work", status: row.Status, waitingOn: row["Waiting On"], blocked: row["Blocked?"], result: row["Result / Completion Note"], evidence: row["Evidence / Drive Link"], why: row["WHY / OUTCOME SUPPORTED"] });
  const handleDelete = async () => {
    if (confirm(`Delete "${row["Work Item / Next Action"] || row.ID}"? This cannot be undone.`)) await onDelete(row.ID);
  };
  return (
    <article className="task-row">
      {editing ? (
        <div className="edit-fields">
          <StatusSelect value={update.status || ""} onChange={v => setUpdate({ ...update, status: v })} pipeline={WORK_PIPELINE} />
          <input value={update.waitingOn || ""} onChange={e => setUpdate({ ...update, waitingOn: e.target.value })} placeholder="Waiting on" />
          <input value={update.result || ""} onChange={e => setUpdate({ ...update, result: e.target.value })} placeholder="Result / completion note" />
          <input value={update.evidence || ""} onChange={e => setUpdate({ ...update, evidence: e.target.value })} placeholder="Evidence / Drive link" />
          <div className="edit-actions">
            <button className="link-button" onClick={() => setEditing(false)}>Cancel</button>
            <AsyncButton className="btn primary" pendingLabel="Saving…" onClick={async () => { await onSave(update); setEditing(false); }}>Save changes</AsyncButton>
          </div>
        </div>
      ) : (
        <>
          <span className="square" />
          <div>
            <b>{row["Work Item / Next Action"] || "Untitled work item"}</b>
            <small>{row["Project / Function"] || "Unassigned"} · {row.Owner || "No owner"}{row["WHY / OUTCOME SUPPORTED"] ? ` · ${row["WHY / OUTCOME SUPPORTED"]}` : ""}</small>
          </div>
          <div className="task-actions">
            <Badge value={row.Status} />
            <button className="link-button" onClick={() => setEditing(true)}>Edit</button>
            <AsyncButton className="link-button" style={{ color: "#ae493e" }} pendingLabel="Deleting…" onClick={handleDelete}>Delete</AsyncButton>
          </div>
        </>
      )}
    </article>
  );
}

function ControlRow({ row, onSave, onDelete }: { row: SheetRow; onSave: (u: SheetRow) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [update, setUpdate] = useState<SheetRow>({ id: row.ID, type: "control", status: row.Status, evidence: row["Evidence / Link"], exception: row["Exception?"], notes: row["Notes / Next Action"] });
  const handleDelete = async () => {
    if (confirm(`Delete "${row.Control || row.ID}"? This cannot be undone.`)) await onDelete(row.ID);
  };
  return (
    <article className="control-card">
      {editing ? (
        <div className="edit-fields">
          <select value={update.status} onChange={e => setUpdate({ ...update, status: e.target.value })}><option>Open</option><option>Complete</option><option>Exception</option></select>
          <select value={update.exception} onChange={e => setUpdate({ ...update, exception: e.target.value })}><option>No</option><option>Yes</option></select>
          <input value={update.evidence || ""} onChange={e => setUpdate({ ...update, evidence: e.target.value })} placeholder="Evidence / link" />
          <input value={update.notes || ""} onChange={e => setUpdate({ ...update, notes: e.target.value })} placeholder="Notes / next action" />
          <div className="edit-actions">
            <button className="link-button" onClick={() => setEditing(false)}>Cancel</button>
            <AsyncButton className="btn primary" pendingLabel="Saving…" onClick={async () => { await onSave(update); setEditing(false); }}>Save changes</AsyncButton>
          </div>
        </div>
      ) : (
        <>
          <div className="control-head">
            <Badge value={row.Status} />
            <div>
              <button className="link-button" onClick={() => setEditing(true)}>Edit</button>
              <AsyncButton className="link-button" style={{ color: "#ae493e", marginLeft: 10 }} pendingLabel="Deleting…" onClick={handleDelete}>Delete</AsyncButton>
            </div>
          </div>
          <h3>{row.Control}</h3>
          <small>{row["Project / Function"]} · {row.Owner} · {row.Cadence}</small>
          <p>{row["Notes / Next Action"] || "No next action recorded."}</p>
        </>
      )}
    </article>
  );
}

// ── Kanban board ────────────────────────────────────────────────────────────
// Generic 4-column board — the caller supplies how to identify a row's id,
// its status, and how to render its card (collapsed or in edit mode), so the
// same board shape works for Work items and any generic register sheet.
function KanbanBoard<T extends SheetRow>({
  rows, statusField = "Status", pipeline, onMove, renderCard,
}: {
  rows: T[];
  statusField?: string;
  pipeline: Pipeline;
  onMove: (row: T, newStatus: string) => void | Promise<unknown>;
  renderCard: (row: T) => React.ReactNode;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const idOf = (row: T) => row[Object.keys(row)[0]];

  return (
    <div className="kanban-board">
      {pipeline.map(stage => {
        const items = rows.filter(r => bucketFor(r[statusField], pipeline) === stage.id);
        return (
          <div
            key={stage.id}
            className="kanban-column"
            onDragOver={e => e.preventDefault()}
            onDrop={() => {
              if (!dragId) return;
              const row = rows.find(r => idOf(r) === dragId);
              if (row && bucketFor(row[statusField], pipeline) !== stage.id) {
                // the handler reports its own toast; swallow the rejection so a failed move isn't an unhandled error
                Promise.resolve(onMove(row, stage.label)).catch(() => {});
              }
              setDragId(null);
            }}
          >
            <div className="kanban-column-header">
              <span className="status-pill">{stage.label}</span>
              <span className="kanban-count">{items.length}</span>
            </div>
            <div className="kanban-column-body">
              {items.map(row => (
                <div key={idOf(row)} draggable onDragStart={() => setDragId(idOf(row))} className="kanban-card-wrap">
                  {renderCard(row)}
                </div>
              ))}
              {!items.length && <p className="sub kanban-empty">Drop items here</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WorkKanbanCard({ row, onSave, onDelete }: { row: SheetRow; onSave: (u: SheetRow) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [update, setUpdate] = useState<SheetRow>({ id: row.ID, type: "work", status: row.Status, waitingOn: row["Waiting On"], result: row["Result / Completion Note"], evidence: row["Evidence / Drive Link"] });
  const handleDelete = async () => {
    if (confirm(`Delete "${row["Work Item / Next Action"] || row.ID}"? This cannot be undone.`)) await onDelete(row.ID);
  };
  if (editing) {
    return (
      <div className="kanban-card">
        <div className="edit-fields kanban-edit-fields">
          <StatusSelect value={update.status || ""} onChange={v => setUpdate({ ...update, status: v })} pipeline={WORK_PIPELINE} />
          <input value={update.waitingOn || ""} onChange={e => setUpdate({ ...update, waitingOn: e.target.value })} placeholder="Waiting on" />
          <input value={update.result || ""} onChange={e => setUpdate({ ...update, result: e.target.value })} placeholder="Result / completion note" />
          <input value={update.evidence || ""} onChange={e => setUpdate({ ...update, evidence: e.target.value })} placeholder="Evidence / Drive link" />
          <div className="edit-actions">
            <button className="link-button" onClick={() => setEditing(false)}>Cancel</button>
            <AsyncButton className="btn primary" pendingLabel="Saving…" onClick={async () => { await onSave(update); setEditing(false); }}>Save</AsyncButton>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="kanban-card">
      <b>{row["Work Item / Next Action"] || "Untitled work item"}</b>
      <small>{row["Project / Function"] || "Unassigned"} · {row.Owner || "No owner"}</small>
      {row["Critical Move?"] === "Yes" && <span className="badge bad">Critical</span>}
      <div className="kanban-card-actions">
        <button className="link-button" onClick={() => setEditing(true)}>Edit</button>
        <AsyncButton className="link-button" style={{ color: "#ae493e" }} pendingLabel="Deleting…" onClick={handleDelete}>Delete</AsyncButton>
      </div>
    </div>
  );
}

function GenericKanbanCard({
  row, sheetName, titleField, subtitleFields, pipeline, statusField = "Status", onUpdate, onDelete,
}: {
  row: SheetRow;
  sheetName: string;
  titleField: string;
  subtitleFields: string[];
  pipeline: Pipeline;
  statusField?: string;
  onUpdate: (sheet: string, id: string, changes: Record<string, string>) => Promise<void>;
  onDelete: (sheet: string, id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(row);
  const id = row[Object.keys(row)[0]];
  const headers = Object.keys(row);

  const handleSave = async () => {
    const changes: Record<string, string> = {};
    headers.forEach(h => { if (values[h] !== row[h]) changes[h] = values[h] ?? ""; });
    if (Object.keys(changes).length) await onUpdate(sheetName, id, changes);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (confirm(`Delete "${row[titleField] || id}"? This cannot be undone.`)) await onDelete(sheetName, id);
  };

  if (editing) {
    return (
      <div className="kanban-card kanban-card-editing">
        {headers.map(h => (
          <label key={h} className="kanban-field">
            <span>{h}</span>
            {h === statusField ? (
              <StatusSelect value={values[h] ?? ""} onChange={v => setValues(vv => ({ ...vv, [h]: v }))} pipeline={pipeline} />
            ) : (
              <input value={values[h] ?? ""} onChange={e => setValues(v => ({ ...v, [h]: e.target.value }))} />
            )}
          </label>
        ))}
        <div className="edit-actions">
          <button className="link-button" onClick={() => { setValues(row); setEditing(false); }}>Cancel</button>
          <AsyncButton className="btn primary" pendingLabel="Saving…" onClick={handleSave}>Save</AsyncButton>
        </div>
      </div>
    );
  }

  return (
    <div className="kanban-card">
      <b>{row[titleField] || id}</b>
      <small>{subtitleFields.map(f => row[f]).filter(Boolean).join(" · ")}</small>
      {row.Priority && <span className={`badge ${/p0/i.test(row.Priority) ? "bad" : ""}`}>{row.Priority}</span>}
      <div className="kanban-card-actions">
        <button className="link-button" onClick={() => setEditing(true)}>Edit</button>
        <AsyncButton className="link-button" style={{ color: "#ae493e" }} pendingLabel="Deleting…" onClick={handleDelete}>Delete</AsyncButton>
      </div>
    </div>
  );
}

function Header({ title, subtitle, data }: { title: string; subtitle: string; data: HqBootstrap }) {
  return (
    <div className="page-top">
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      <div className="chips">
        <span className="chip">{data.source === "demo" ? "Demo data" : "Connected"}</span>
        <span className="chip">{data.generatedAt ? `Updated ${new Date(data.generatedAt).toLocaleDateString()}` : ""}</span>
      </div>
    </div>
  );
}

function Kpi({ label, value, detail, tone }: { label: string; value: number | string; detail: string; tone: string }) {
  return <div className={`card kpi ${tone}`}><span className="label">{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

// ── First-time guidance tour ──────────────────────────────────────────────
const guideSteps: { title: string; body: string }[] = [
  {
    title: "Welcome to Ahmad HQ",
    body: "This is the management system for capturing work, running weekly controls, and tracking every operating area in one place. This quick guide walks through what each section is for — it only takes a minute, and you can reopen it anytime from the \"? Guide\" button in the sidebar.",
  },
  {
    title: "Home, My Work, Manage",
    body: "HOME is your daily snapshot — open work, critical moves, blocked items, and active alerts across everything. MY WORK lists every work item assigned anywhere, so you can see status, owner, and due dates in one list. MANAGE holds plans, periods, and incoming requests — the higher-level planning layer above day-to-day work.",
  },
  {
    title: "Operating area tabs",
    body: "Each business area — Edible, Gardenia's Fire, Finance & Office, Property, People & Systems, Personal/Ahmad, Iron Marks — has its own tab. Opening one shows only that area's work items plus the registers specific to it (e.g. Finance & Office shows the Finance Register; Gardenia's Fire shows its Sales Pipeline). Use these when you want to focus on one part of the business instead of everything at once.",
  },
  {
    title: "Close / Review and Intelligence",
    body: "CLOSE / REVIEW is where weekly controls get signed off and checklists get run — this is the accountability layer: did the recurring things that must happen, actually happen? INTELLIGENCE is the numbers view — Key Status Indicators, targets, and budgets — for tracking performance over time rather than individual tasks.",
  },
  {
    title: "Quick actions",
    body: "Under QUICK in the sidebar: \"Capture / Inbox\" is the fastest way to turn a thought or request into a tracked work item — use it the moment something comes up so it doesn't get lost. Customers and Decisions are dedicated views for customer relationship data and logged decisions/exceptions. You're all set — click below to start using the system.",
  },
];

function GuideTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const last = step === guideSteps.length - 1;
  const current = guideSteps[step];
  return (
    <div className="guide-overlay" role="dialog" aria-modal="true" aria-label="Ahmad HQ guide">
      <div className="guide-card">
        <div className="guide-progress">
          {guideSteps.map((_, i) => <span key={i} className={`guide-dot ${i === step ? "active" : ""}`} />)}
        </div>
        <h2>{current.title}</h2>
        <p>{current.body}</p>
        <div className="guide-actions">
          <button className="link-button" onClick={onClose}>Skip guide</button>
          <div style={{ display: "flex", gap: 10 }}>
            {step > 0 && <button className="btn" onClick={() => setStep(s => s - 1)}>Back</button>}
            <button className="btn primary" onClick={() => (last ? onClose() : setStep(s => s + 1))}>
              {last ? "Got it, let's go" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const areas: { id: View; label: string; icon: string; match: string[] }[] = [
  { id: "store", label: "EDIBLE - STORE", icon: "▦", match: ["edible"] },
  { id: "gardenia", label: "GARDENIA'S FIRE", icon: "✿", match: ["gardenia"] },
  { id: "finance", label: "FINANCE & OFFICE", icon: "$", match: ["finance"] },
  { id: "property", label: "BUYAHKA / PROPERTY", icon: "▥", match: ["property"] },
  { id: "people", label: "PEOPLE & SYSTEMS", icon: "♟", match: ["people"] },
  { id: "personal", label: "PERSONAL / AHMAD", icon: "●", match: ["personal", "ahmad"] },
  { id: "iron", label: "IRON MARKS", icon: "◇", match: ["iron"] },
];

function Home({ data, onSave, onDelete }: { data: HqBootstrap; onSave: (u: SheetRow) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const open = data.work.filter(r => !closed(r.Status));
  const blocked = open.filter(r => r["Blocked?"] === "Yes");
  const critical = open.filter(r => r["Critical Move?"] === "Yes");
  const escalated = open.filter(r => r["Management Escalation?"] === "Yes");
  const openAlerts = data.alerts.filter(r => !/resolved|closed/i.test(r.Status || ""));
  const recentlyCompleted = [
    ...data.work.filter(r => closed(r.Status)).map(r => ({ area: r["Project / Function"] || "—", task: r["Work Item / Next Action"] || "—", when: r["COMPLETED AT"] || r["Last Update"] || "" })),
    ...data.gardeniaTasks.filter(r => closed(r.Status)).map(r => ({ area: "Gardenia's Fire", task: r.Task || "—", when: "" })),
    ...data.ironTasks.filter(r => closed(r.Status)).map(r => ({ area: "Iron Marks", task: r.Task || "—", when: "" })),
    ...data.firefliesLegacy.filter(r => closed(r.Status)).map(r => ({ area: "Fireflies & Legacy", task: r["Clinton Task"] || "—", when: "" })),
  ].sort((a, b) => new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime()).slice(0, 8);
  return (
    <>
      <Header title="Management Home" subtitle="What matters, what changed, what needs attention." data={data} />
      <section className="kpis">
        <Kpi label="Open work" value={open.length} detail="Current execution queue" tone="sage" />
        <Kpi label="Critical moves" value={critical.length} detail="Result-producing focus" tone="blue" />
        <Kpi label="Blocked" value={blocked.length} detail="Needs unblocking" tone="yellow" />
        <Kpi label="Escalated" value={escalated.length} detail="Needs management attention" tone="lav" />
        <Kpi label="Open alerts" value={openAlerts.length} detail="Active system alerts" tone="peach" />
        <Kpi label="Exceptions" value={data.exceptions.filter(r => !/closed/i.test(r.Status || "")).length} detail="Open exceptions" tone="mint" />
      </section>
      <div className="dashboard-grid">
        <section className="card">
          <h2 className="section-title">Critical moves</h2>
          {critical.slice(0, 5).map(r => <WorkRow row={r} onSave={onSave} onDelete={onDelete} key={r.ID} />)}
          {!critical.length && <p className="sub">No critical moves currently recorded.</p>}
        </section>
        <section className="card">
          <h2 className="section-title">Exceptions & attention</h2>
          {[...blocked, ...escalated.filter(r => !blocked.includes(r))].slice(0, 5).map(r => <WorkRow row={r} onSave={onSave} onDelete={onDelete} key={r.ID} />)}
          {!blocked.length && !escalated.length && <p className="sub">No exceptions currently recorded.</p>}
        </section>
      </div>
      {openAlerts.length > 0 && (
        <Section title="Active Alerts">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead><tr>{["Alert ID", "Type", "Message", "Severity", "Business / Area", "Status"].map(h => <th key={h} style={{ padding: "6px 10px", background: "#173B5B", color: "#fff", textAlign: "left" }}>{h}</th>)}</tr></thead>
              <tbody>{openAlerts.map((r, i) => <tr key={i} style={{ background: i % 2 ? "#f8f9fb" : "#fff", borderBottom: "1px solid #e8eaf0" }}>{["Alert ID", "Type", "Message", "Severity", "Business / Area", "Status"].map(h => <td key={h} style={{ padding: "6px 10px" }}>{r[h] || "—"}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </Section>
      )}
      <Section title="Recently Completed">
        {recentlyCompleted.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead><tr>{["Area", "Task", "Completed"].map(h => <th key={h} style={{ padding: "6px 10px", background: "#173B5B", color: "#fff", textAlign: "left" }}>{h}</th>)}</tr></thead>
              <tbody>{recentlyCompleted.map((r, i) => (
                <tr key={i} style={{ background: i % 2 ? "#f8f9fb" : "#fff", borderBottom: "1px solid #e8eaf0" }}>
                  <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>{r.area}</td>
                  <td style={{ padding: "6px 10px" }}>{r.task}</td>
                  <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>{r.when ? new Date(r.when).toLocaleDateString() : "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="sub">Nothing completed yet — closed tasks from any area will show up here.</p>}
      </Section>
      <Section title="Recent Activity">
        {(() => {
          const recent = [...data.activity]
            .filter(r => r["Action Type"] === "Task Assigned")
            .sort((a, b) => new Date(b.Timestamp || 0).getTime() - new Date(a.Timestamp || 0).getTime())
            .slice(0, 8);
          if (!recent.length) return <p className="sub">No activity recorded yet — captured tasks and changes will show up here.</p>;
          return (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead><tr>{["Timestamp", "Business / Area", "Detail"].map(h => <th key={h} style={{ padding: "6px 10px", background: "#173B5B", color: "#fff", textAlign: "left" }}>{h}</th>)}</tr></thead>
                <tbody>{recent.map((r, i) => (
                  <tr key={i} style={{ background: i % 2 ? "#f8f9fb" : "#fff", borderBottom: "1px solid #e8eaf0" }}>
                    <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>{r.Timestamp ? new Date(r.Timestamp).toLocaleString() : "—"}</td>
                    <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>{r["Business / Area"] || "—"}</td>
                    <td style={{ padding: "6px 10px" }}>{r.Detail || "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          );
        })()}
      </Section>
    </>
  );
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState(emptyData);
  const [view, setView] = useState<View>("home");
  const [selectedFunction, setSelectedFunction] = useState(functions[0]);
  const [selectedCustomSheet, setSelectedCustomSheet] = useState<string>("");
  const [workBoardView, setWorkBoardView] = useState(true);
  const [backlogBoardView, setBacklogBoardView] = useState(true);
  const [areaTab, setAreaTab] = useState<Record<string, string>>({});
  const [captureArea, setCaptureArea] = useState("");
  const [gardeniaTasksBoardView, setGardeniaTasksBoardView] = useState(true);
  const [gardeniaPipelineBoardView, setGardeniaPipelineBoardView] = useState(true);
  const [ironTasksBoardView, setIronTasksBoardView] = useState(true);
  const [areaWorkBoardView, setAreaWorkBoardView] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return;
    try {
      const key = `ahq-guide-seen:${session.user.email.toLowerCase()}`;
      // localStorage is a browser-only external system that can't be read during render/SSR,
      // so this genuinely has to happen post-mount in an effect rather than being derived.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(key)) setShowGuide(true);
    } catch {
      // localStorage can be unavailable (private browsing, etc.) — just skip the tour rather than error.
    }
  }, [status, session?.user?.email]);

  function dismissGuide() {
    setShowGuide(false);
    try {
      if (session?.user?.email) localStorage.setItem(`ahq-guide-seen:${session.user.email.toLowerCase()}`, "1");
    } catch {
      // ignore — worst case the guide reappears next visit
    }
  }

  useEffect(() => {
    // `loading` is only ever read once status is "authenticated" (the "unauthenticated"
    // case short-circuits to the sign-in screen before renderView()/loading matter), so
    // there's nothing to set here when the user isn't signed in.
    if (status !== "authenticated") return;
    fetch("/api/hq")
      .then(async res => {
        const payload = await res.json();
        if (!res.ok || !Array.isArray(payload.work)) throw new Error(payload.message || payload.error || "Could not load workspace.");
        setData({ ...emptyData, ...payload });
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load workspace."))
      .finally(() => setLoading(false));
  }, [status]);

  const areaRows = useMemo(() => {
    const selected = areas.find(a => a.id === view);
    if (!selected) return data.work;
    return data.work.filter(r => selected.match.some(m => String(r["Project / Function"] || "").toLowerCase().includes(m)));
  }, [data.work, view]);

  const visibleWork = view === "operate"
    ? data.work.filter(r => r["Project / Function"] === selectedFunction)
    : areaRows;

  // Network wrapper: a dropped connection becomes `null` instead of a thrown TypeError.
  const call = (url: string, init: RequestInit) => fetch(url, init).catch(() => null);

  async function saveRow(update: SheetRow, message = "Saved") {
    const prevWork = data.work.find(r => r.ID === update.id);
    const prevControl = data.controls.find(r => r.ID === update.id);
    // Optimistic: show the change immediately, roll it back if the server says no.
    setData(cur => ({
      ...cur,
      work: cur.work.map(r => r.ID !== update.id ? r : {
        ...r,
        ...(update.status !== undefined && { Status: update.status }),
        ...(update.waitingOn !== undefined && { "Waiting On": update.waitingOn }),
        ...(update.result !== undefined && { "Result / Completion Note": update.result }),
        ...(update.evidence !== undefined && { "Evidence / Drive Link": update.evidence }),
      }),
      controls: cur.controls.map(r => r.ID !== update.id ? r : {
        ...r,
        ...(update.status !== undefined && { Status: update.status }),
        ...(update.evidence !== undefined && { "Evidence / Link": update.evidence }),
        ...(update.exception !== undefined && { "Exception?": update.exception }),
        ...(update.notes !== undefined && { "Notes / Next Action": update.notes }),
      }),
    }));
    const res = await tracked(() => call("/api/hq", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update) }));
    if (!res || !res.ok) {
      setData(cur => ({
        ...cur,
        work: cur.work.map(r => (prevWork && r.ID === update.id ? prevWork : r)),
        controls: cur.controls.map(r => (prevControl && r.ID === update.id ? prevControl : r)),
      }));
      notify("Couldn't save that change — it was undone. Please try again.", "error");
      throw new Error("Save failed");
    }
    notify(message);
  }

  // Sheets created via "+ New Register" aren't a fixed HqBootstrap field (sheetToKey
  // won't have an entry for them) — their rows live in data.customSheets[sheet] instead.
  function updateSheetRows(sheet: string, updater: (rows: SheetRow[]) => SheetRow[]) {
    setData(cur => {
      const dataKey = sheetToKey[sheet];
      if (dataKey) return { ...cur, [dataKey]: updater(cur[dataKey as keyof HqBootstrap] as SheetRow[]) };
      return { ...cur, customSheets: { ...cur.customSheets, [sheet]: updater(cur.customSheets[sheet] || []) } };
    });
  }

  // The sheet's current rows for a generic sheet, whether it's a built-in field or a custom register.
  function currentSheetRows(sheet: string): SheetRow[] {
    const dataKey = sheetToKey[sheet];
    return dataKey ? (data[dataKey as keyof HqBootstrap] as SheetRow[]) : (data.customSheets[sheet] || []);
  }

  // Generic update for any HQ_* sheet. Optimistic: the change shows instantly and is rolled back if saving fails.
  async function updateAnyRow(sheet: string, id: string, changes: Record<string, string>, message = "Saved") {
    const isTarget = (r: SheetRow) => r[Object.keys(r)[0]] === id;
    const prev = currentSheetRows(sheet).find(isTarget);
    updateSheetRows(sheet, rows => rows.map(r => isTarget(r) ? { ...r, ...changes } : r));
    const res = await tracked(() => call("/api/hq", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "generic", sheet, id, changes }),
    }));
    if (!res || !res.ok) {
      if (prev) updateSheetRows(sheet, rows => rows.map(r => isTarget(r) ? prev : r));
      notify("Couldn't save that change — it was undone. Please try again.", "error");
      throw new Error("Save failed");
    }
    notify(message);
  }

  // Generic append for any HQ_* sheet
  async function addAnyRow(sheet: string, row: Record<string, string>, message: string | null = "Added") {
    const res = await tracked(() => call("/api/hq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "generic", sheet, row }),
    }));
    if (!res || !res.ok) {
      notify("Couldn't add that — please try again.", "error");
      throw new Error("Add failed");
    }
    updateSheetRows(sheet, rows => [...rows, row]);
    if (message) notify(message);
  }

  // Generic delete for any HQ_* sheet
  async function deleteAnyRow(sheet: string, id: string) {
    const res = await tracked(() => call("/api/hq", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "generic", sheet, id }),
    }));
    if (!res || !res.ok) {
      notify("Couldn't delete that — please try again.", "error");
      throw new Error("Delete failed");
    }
    updateSheetRows(sheet, rows => rows.filter(r => r[Object.keys(r)[0]] !== id));
    notify("Deleted");
  }

  async function deleteWorkItem(id: string) {
    const res = await tracked(() => call("/api/hq", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "work", id }) }));
    if (!res || !res.ok) {
      notify("Couldn't delete that — please try again.", "error");
      throw new Error("Delete failed");
    }
    setData(cur => ({ ...cur, work: cur.work.filter(r => r.ID !== id) }));
    notify("Deleted");
  }

  async function deleteControlItem(id: string) {
    const res = await tracked(() => call("/api/hq", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "control", id }) }));
    if (!res || !res.ok) {
      notify("Couldn't delete that — please try again.", "error");
      throw new Error("Delete failed");
    }
    setData(cur => ({ ...cur, controls: cur.controls.filter(r => r.ID !== id) }));
    notify("Deleted");
  }

  // Create a brand-new register sheet — no code change needed for it to show up.
  async function createSheet(label: string, columns: string[]) {
    const res = await tracked(() => call("/api/hq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "createSheet", label, columns }),
    }));
    const payload = await res?.json().catch(() => null);
    if (!res || !res.ok || !payload?.ok) { notify(payload?.error || "Could not create the new sheet.", "error"); return null; }
    notify(`Register "${payload.label}" created`);
    setData(cur => ({
      ...cur,
      customSheetDefs: [...cur.customSheetDefs, { name: payload.name, label: payload.label, columns: payload.columns }],
      customSheets: { ...cur.customSheets, [payload.name]: [] },
    }));
    return payload.name as string;
  }

  async function assignTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (assigning) return;
    // Grab the form now: React clears event.currentTarget once this handler yields (after the first await).
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const description = String(form.get("description") || "").trim();
    const areaKey = String(form.get("area") || "");
    const assignee = String(form.get("assignee") || "").trim() || "Ahmad";
    const due = String(form.get("due") || "");
    const priority = String(form.get("priority") || "");
    const route = CAPTURE_ROUTES[areaKey];
    if (!description || !route) { notify("Add a task description and choose an area first.", "error"); return; }

    setAssigning(true);
    try {
      let destSheet: string;
      let newId: string;

      if (route.kind === "work") {
        // No client-side ID here — the server is the sole authority for work item IDs (see lib/hq-data.ts nextWorkId).
        const row: SheetRow = { "Project / Function": route.label, "Work Item / Next Action": description, Owner: assignee, Priority: priority, "Due Date": due };
        const res = await tracked(() => call("/api/hq", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row) }));
        const payload = await res?.json().catch(() => null);
        if (!res || !res.ok || !payload?.id) { notify("The task could not be saved — please try again.", "error"); return; }
        setData(cur => ({ ...cur, work: [{ ...row, ID: payload.id, Status: "Open" }, ...cur.work] }));
        destSheet = "HQ_WORK";
        newId = payload.id;
      } else {
        newId = `${route.idPrefix}-${Date.now().toString(36).toUpperCase()}`;
        const row: SheetRow = { ID: newId, ...route.buildRow({ description, assignee, due, priority }) };
        try {
          await addAnyRow(route.sheet, row, null);
        } catch {
          notify("The task could not be saved — please try again.", "error");
          return;
        }
        destSheet = route.sheet;
      }

      // Best-effort history log — a failure here shouldn't undo the task that already saved above.
      try {
        await addAnyRow("HQ_ACTIVITY", {
          Timestamp: new Date().toISOString(),
          User: "Ahmad",
          "Action Type": "Task Assigned",
          "Business / Area": route.label,
          "Source Type": destSheet,
          "Source ID": newId,
          Detail: `${description} → ${assignee}`,
        }, null);
      } catch { /* history log is best-effort */ }

      notify(`Task assigned to ${assignee} in ${route.label}`);
      formEl.reset();
    } finally {
      setAssigning(false);
    }
  }

  const nav = (v: View) => {
    if (v === "add") setCaptureArea("");
    setView(v);
  };

  const mainNav: [View, string, string][] = [
    ["home", "HOME", "▣"], ["work", "MY WORK", "✓"], ["manage", "MANAGE", "◎"],
    ...areas.map(a => [a.id, a.label, a.icon] as [View, string, string]),
    ["close", "CLOSE / REVIEW", "✓"], ["intel", "INTELLIGENCE", "⌁"],
    ["firefliesLegacy", "FIREFLIES & LEGACY", "⚙"],
  ];

  // Helpers for editable tables
  const edt = (sheet: string, rows: SheetRow[], priorityCols?: string[], columns?: string[], pipeline?: Pipeline, statusField?: string, defaults?: Record<string, string>) => (
    <EditableDataTable rows={rows} sheetName={sheet} priorityCols={priorityCols} columns={columns} pipeline={pipeline} statusField={statusField} defaults={defaults} onUpdate={updateAnyRow} onAdd={addAnyRow} onDelete={deleteAnyRow} />
  );

  // Board/list Work Items view shared by the areas that don't have their own
  // dedicated task sheet — same Board/List pattern as My Work and the areas
  // that do (Gardenia's Fire, Iron Marks), just scoped to that area's rows.
  const workItemsBoard = (rows: SheetRow[]) => (
    <section className="card">
      <div className="list-toolbar">
        <span className="sub">{rows.filter(r => !closed(r.Status)).length} active work items</span>
        <div className="chips">
          <button className={`chip ${areaWorkBoardView ? "selected" : ""}`} onClick={() => setAreaWorkBoardView(true)}>▤ Board</button>
          <button className={`chip ${!areaWorkBoardView ? "selected" : ""}`} onClick={() => setAreaWorkBoardView(false)}>☰ List</button>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="sub">No work items.</p>
      ) : areaWorkBoardView ? (
        <KanbanBoard
          rows={rows}
          pipeline={WORK_PIPELINE}
          onMove={(row, status) => saveRow({ id: row.ID, type: "work", status }, `Moved to ${status}`)}
          renderCard={row => <WorkKanbanCard row={row} onSave={saveRow} onDelete={deleteWorkItem} />}
        />
      ) : (
        rows.map(r => <WorkRow row={r} onSave={saveRow} onDelete={deleteWorkItem} key={r.ID} />)
      )}
    </section>
  );

  if (status === "loading") {
    return <main className="system-shell"><div className="card loading-state">Connecting to authentication...</div></main>;
  }

  if (status === "unauthenticated") {
    return (
      <main className="system-shell" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div className="card" style={{ maxWidth: 400, textAlign: "center" }}>
          <h2>Ahmad HQ</h2>
          <p className="sub" style={{ marginBottom: 24 }}>Management system login.</p>
          <button className="btn primary" onClick={() => signIn("google")} style={{ width: "100%", padding: "10px 16px" }}>
            Sign in with Google
          </button>
        </div>
      </main>
    );
  }

  // ── Area pages: Summary / Tasks / Weekly Closing / KPIs + business-specific tabs ──
  const openCapture = (captureKey: string) => { setCaptureArea(captureKey); setView("add"); };
  const byTimestampDesc = (a: SheetRow, b: SheetRow) => new Date(b.Timestamp || 0).getTime() - new Date(a.Timestamp || 0).getTime();
  const colsOf = (all: SheetRow[], fallback: string[]) => (all.length ? Object.keys(all[0]) : fallback);
  const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);

  // A register narrowed to one business. Headers come from the full sheet (a filtered-empty
  // list has none) and new rows get the business pre-filled so they don't vanish on add.
  const areaTable = (sheet: string, all: SheetRow[], keep: (r: SheetRow) => boolean, priority: string[], defaults: Record<string, string>) =>
    edt(sheet, all.filter(keep), priority, colsOf(all, priority), undefined, undefined, defaults);

  type TaskLite = { title: string; status: string; owner: string; due: string; priority: string; blocked: boolean };
  // One normalized task list per area, whether its tasks live in the shared Work sheet or a dedicated task sheet.
  function areaTasks(viewId: string): TaskLite[] {
    const fromWork: TaskLite[] = visibleWork.map(r => ({ title: r["Work Item / Next Action"] || "Untitled", status: r.Status || "", owner: r.Owner || "", due: r["Due Date"] || "", priority: r.Priority || "", blocked: r["Blocked?"] === "Yes" }));
    const sheetRows = viewId === "gardenia" ? data.gardeniaTasks : viewId === "iron" ? data.ironTasks : [];
    const fromSheet: TaskLite[] = sheetRows.map(r => ({ title: r.Task || "Untitled", status: r.Status || "", owner: r.Owner || "", due: r.Due || "", priority: r.Priority || "", blocked: false }));
    return [...fromSheet, ...fromWork];
  }
  function taskStats(tasks: TaskLite[]) {
    const done = tasks.filter(t => closed(t.status));
    const open = tasks.filter(t => !closed(t.status));
    const inProgress = open.filter(t => /progress|review|test/i.test(t.status));
    const blocked = open.filter(t => t.blocked);
    // Only trust due dates that carry a year ("Friday, 12 Sep" would parse as 2001 and flag everything overdue).
    const overdue = open.filter(t => /\d{4}/.test(t.due) && Date.parse(t.due) < Date.now() - 86400000);
    return { total: tasks.length, done, open, inProgress, blocked, overdue, pct: tasks.length ? Math.round((done.length / tasks.length) * 100) : 0 };
  }

  // Business-specific headline numbers, shared by the Summary and KPIs tabs.
  function areaSpotlight(viewId: string, cfg: AreaPage): { label: string; value: string | number; detail: string; tone: string }[] {
    if (viewId === "gardenia") {
      const stageIdx = (r: SheetRow) => SALES_PIPELINE.findIndex(s => s.id === bucketFor(r.Stage, SALES_PIPELINE));
      const reached = (id: string) => data.gardeniaPipeline.filter(r => stageIdx(r) >= SALES_PIPELINE.findIndex(s => s.id === id)).length;
      return [
        { label: "Accounts", value: data.gardeniaPipeline.length, detail: "In the sales pipeline", tone: "lav" },
        { label: "Qualified", value: reached("qualified"), detail: "Qualified or further along", tone: "blue" },
        { label: "Tastings", value: reached("tastingScheduled"), detail: `${reached("tastingCompleted")} completed`, tone: "sage" },
        { label: "First orders", value: reached("firstOrderWon"), detail: `${reached("recurringWon")} recurring`, tone: "mint" },
      ];
    }
    if (viewId === "store") {
      const runs = data.checklistRuns.filter(r => cfg.business.test(r.Business || ""));
      const completion = avg(runs.map(r => parseFloat(r["Completion %"])).filter(n => !Number.isNaN(n)));
      const onTime = runs.filter(r => /yes/i.test(r["On Time?"] || "")).length;
      const ratings = data.reviews.filter(r => cfg.business.test(r.Business || "")).map(r => parseFloat(r.Rating)).filter(n => !Number.isNaN(n));
      const rating = avg(ratings);
      return [
        { label: "Checklist completion", value: completion === null ? "—" : `${Math.round(completion)}%`, detail: `${runs.length} runs · ${onTime} on time`, tone: "sage" },
        { label: "Avg review rating", value: rating === null ? "—" : rating.toFixed(1), detail: `${ratings.length} reviews`, tone: "lav" },
      ];
    }
    if (viewId === "finance") {
      const open = data.financeReg.filter(r => !/closed|complete|paid|done|resolved/i.test(r.Status || ""));
      return [
        { label: "Register items", value: data.financeReg.length, detail: `${open.length} still open`, tone: "lav" },
        { label: "Budget lines", value: data.budgets.length, detail: "Across all businesses", tone: "blue" },
      ];
    }
    return [];
  }

  function areaSummaryTab(viewId: string, cfg: AreaPage) {
    const s = taskStats(areaTasks(viewId));
    const attention = [...s.blocked, ...s.overdue.filter(t => !s.blocked.includes(t)), ...s.open.filter(t => /p0/i.test(t.priority) && !s.blocked.includes(t) && !s.overdue.includes(t))].slice(0, 6);
    const assigned = data.activity.filter(r => r["Action Type"] === "Task Assigned" && cfg.business.test(r["Business / Area"] || "")).sort(byTimestampDesc).slice(0, 5);
    return (
      <>
        <section className="kpis">
          <Kpi label="Open tasks" value={s.open.length} detail={`${s.total} total`} tone="sage" />
          <Kpi label="In progress" value={s.inProgress.length} detail="Being worked on now" tone="blue" />
          <Kpi label="Blocked" value={s.blocked.length} detail="Needs unblocking" tone="yellow" />
          <Kpi label="Overdue" value={s.overdue.length} detail="Past their due date" tone="peach" />
          <Kpi label="Completed" value={s.done.length} detail={`${s.pct}% of all tasks`} tone="mint" />
          {areaSpotlight(viewId, cfg).map(k => <Kpi key={k.label} {...k} />)}
        </section>
        <section className="card" style={{ marginBottom: 16 }}>
          <div className="list-toolbar">
            <h2 className="section-title" style={{ margin: 0 }}>Progress</h2>
            <button className="btn primary" onClick={() => openCapture(cfg.captureKey)}>＋ Assign a task</button>
          </div>
          <div className="progress" role="progressbar" aria-valuenow={s.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.pct}% of tasks complete`}><span style={{ width: `${s.pct}%` }} /></div>
          <p className="sub" style={{ marginBottom: 0 }}>{s.done.length} of {s.total} tasks complete ({s.pct}%)</p>
        </section>
        <div className="dashboard-grid">
          <section className="card">
            <h2 className="section-title">Needs attention</h2>
            {attention.map((t, i) => (
              <div className="mini-row" key={i}><b>{t.title}</b><small>{[t.priority, t.owner, t.due].filter(Boolean).join(" · ") || "—"}</small></div>
            ))}
            {!attention.length && <p className="sub">Nothing blocked, overdue or P0 — clear.</p>}
          </section>
          <section className="card">
            <h2 className="section-title">Recently completed</h2>
            {s.done.slice(0, 6).map((t, i) => (
              <div className="mini-row" key={i}><b>{t.title}</b><small>{t.owner || "—"}</small></div>
            ))}
            {!s.done.length && <p className="sub">Nothing completed yet — finished tasks will show up here.</p>}
          </section>
        </div>
        <Section title="Recently assigned">
          {assigned.length ? assigned.map((r, i) => (
            <div className="mini-row" key={i}><b>{r.Detail || "—"}</b><small>{r.Timestamp ? new Date(r.Timestamp).toLocaleString() : ""}</small></div>
          )) : <p className="sub">Tasks assigned to {cfg.label} from Capture / Inbox will show up here.</p>}
        </Section>
      </>
    );
  }

  // A dedicated-sheet task board (Gardenia's Fire, Iron Marks): Board/List toggle over one sheet.
  const sheetTaskBoard = (sheet: string, rows: SheetRow[], board: boolean, setBoard: (b: boolean) => void) => (
    <section className="card">
      <div className="list-toolbar">
        <span className="sub">{rows.length} tasks</span>
        <div className="chips">
          <button className={`chip ${board ? "selected" : ""}`} onClick={() => setBoard(true)}>▤ Board</button>
          <button className={`chip ${!board ? "selected" : ""}`} onClick={() => setBoard(false)}>☰ List</button>
        </div>
      </div>
      {board ? (
        <KanbanBoard
          rows={rows}
          pipeline={GARDENIA_PIPELINE}
          onMove={(row, status) => updateAnyRow(sheet, row.ID, { Status: status }, `Moved to ${status}`)}
          renderCard={row => (
            <GenericKanbanCard row={row} sheetName={sheet} titleField="Task" subtitleFields={["Owner", "Due"]} pipeline={GARDENIA_PIPELINE} onUpdate={updateAnyRow} onDelete={deleteAnyRow} />
          )}
        />
      ) : (
        edt(sheet, rows, ["ID", "Task", "Description", "Priority", "Status", "Owner", "Due", "Notes"], undefined, GARDENIA_PIPELINE)
      )}
    </section>
  );

  function areaTasksTab(viewId: string, cfg: AreaPage) {
    const dedicated = viewId === "gardenia"
      ? { sheet: "HQ_GARDENIA_TASKS", rows: data.gardeniaTasks, board: gardeniaTasksBoardView, setBoard: setGardeniaTasksBoardView }
      : viewId === "iron"
        ? { sheet: "HQ_IRONMARK_TASKS", rows: data.ironTasks, board: ironTasksBoardView, setBoard: setIronTasksBoardView }
        : null;
    return (
      <>
        <div className="list-toolbar" style={{ marginBottom: 12 }}>
          <span className="sub">Drag cards between columns to update their status.</span>
          <button className="btn primary" onClick={() => openCapture(cfg.captureKey)}>＋ Assign a task</button>
        </div>
        {dedicated ? (
          <>
            <StatusSummary rows={dedicated.rows} pipeline={GARDENIA_PIPELINE} />
            {sheetTaskBoard(dedicated.sheet, dedicated.rows, dedicated.board, dedicated.setBoard)}
            {visibleWork.length > 0 && <Section title="Work desk items">{workItemsBoard(visibleWork)}</Section>}
          </>
        ) : (
          <>
            <StatusSummary rows={visibleWork} pipeline={WORK_PIPELINE} />
            {workItemsBoard(visibleWork)}
          </>
        )}
      </>
    );
  }

  function gardeniaPipelineTab() {
    return (
      <>
        <StatusSummary rows={data.gardeniaPipeline} pipeline={SALES_PIPELINE} statusField="Stage" />
        <section className="card">
          <div className="list-toolbar">
            <span className="sub">{data.gardeniaPipeline.length} accounts</span>
            <div className="chips">
              <button className={`chip ${gardeniaPipelineBoardView ? "selected" : ""}`} onClick={() => setGardeniaPipelineBoardView(true)}>▤ Board</button>
              <button className={`chip ${!gardeniaPipelineBoardView ? "selected" : ""}`} onClick={() => setGardeniaPipelineBoardView(false)}>☰ List</button>
            </div>
          </div>
          {gardeniaPipelineBoardView ? (
            <KanbanBoard
              rows={data.gardeniaPipeline}
              statusField="Stage"
              pipeline={SALES_PIPELINE}
              onMove={(row, stage) => updateAnyRow("HQ_GARDENIA_PIPELINE", row["Account / Prospect"], { Stage: stage }, `${row["Account / Prospect"]} moved to ${stage}`)}
              renderCard={row => (
                <GenericKanbanCard row={row} sheetName="HQ_GARDENIA_PIPELINE" titleField="Account / Prospect" subtitleFields={["Contact / Company", "Revenue / Value"]} pipeline={SALES_PIPELINE} statusField="Stage" onUpdate={updateAnyRow} onDelete={deleteAnyRow} />
              )}
            />
          ) : (
            edt("HQ_GARDENIA_PIPELINE", data.gardeniaPipeline, ["Account / Prospect", "Stage", "Contact / Company", "Revenue / Value", "Risk", "Next Follow-up", "Owner"], undefined, SALES_PIPELINE, "Stage")
          )}
        </section>
      </>
    );
  }

  function areaClosingTab(cfg: AreaPage) {
    const wk = isoWeekKey();
    const belongs = (r: SheetRow) => cfg.business.test(r.Business || "");
    const runs = data.checklistRuns.filter(belongs);
    const wraps = data.notes
      .filter(n => n["Source Type"] === "WEEKLY CLOSE" && cfg.business.test(n["Business / Area"] || ""))
      .sort(byTimestampDesc);
    const saveWrapUp = async (note: string) => {
      await addAnyRow("HQ_NOTES", {
        Timestamp: new Date().toISOString(),
        "Business / Area": cfg.label,
        "Source Type": "WEEKLY CLOSE",
        "Source ID": wk,
        Note: note,
        Author: session?.user?.name || "Ahmad",
      }, `${wk} wrap-up saved for ${cfg.label}`);
    };
    return (
      <>
        <Section title="Checklists for this business">
          {areaTable("HQ_CHECKLIST_RUNS", data.checklistRuns, belongs, ["Checklist Name", "Period Key", "Status", "Completion %", "On Time?", "Owner"], { Business: cfg.label })}
          <p className="sub" style={{ marginBottom: 0 }}>{runs.length} run{runs.length === 1 ? "" : "s"} recorded. Use “Run Maintenance” in the sidebar to generate the missing daily/weekly checklists.</p>
        </Section>
        <Section title={`Weekly wrap-up · ${wk}`}>
          <WeeklyWrapUpForm weekKey={wk} onSave={saveWrapUp} />
        </Section>
        <Section title="Past wrap-ups">
          {wraps.length ? wraps.map(w => (
            <article className="wrapup" key={w.Timestamp}>
              <div className="list-toolbar" style={{ marginBottom: 4 }}>
                <b>{w["Source ID"] || "Wrap-up"}</b>
                <small>{w.Timestamp ? new Date(w.Timestamp).toLocaleString() : ""}{w.Author ? ` · ${w.Author}` : ""}</small>
              </div>
              <p style={{ whiteSpace: "pre-wrap", margin: "0 0 6px" }}>{w.Note}</p>
              <AsyncButton className="link-button" style={{ color: "#ae493e" }} pendingLabel="Deleting…" onClick={async () => { if (confirm("Delete this wrap-up? This cannot be undone.")) await deleteAnyRow("HQ_NOTES", w.Timestamp); }}>Delete</AsyncButton>
            </article>
          )) : <p className="sub">No wrap-ups saved yet. Fill in the form above at the end of the week — each one is kept here as a record.</p>}
        </Section>
      </>
    );
  }

  function areaKpiTab(viewId: string, cfg: AreaPage) {
    const s = taskStats(areaTasks(viewId));
    const spotlight = areaSpotlight(viewId, cfg);
    return (
      <>
        <section className="kpis">
          <Kpi label="Task completion" value={`${s.pct}%`} detail={`${s.done.length} of ${s.total} done`} tone="mint" />
          <Kpi label="Open tasks" value={s.open.length} detail="Still to do" tone="sage" />
          <Kpi label="Overdue" value={s.overdue.length} detail="Past their due date" tone="peach" />
          {spotlight.map(k => <Kpi key={k.label} {...k} />)}
        </section>
        <Section title="Key Status Indicators">
          {areaTable("HQ_KSI", data.ksi, r => cfg.business.test(r["Business / Area"] || ""), ["Metric / Indicator", "Current", "Status", "Threshold / Target", "Direction", "Owner", "Next Move"], { "Business / Area": cfg.label })}
        </Section>
        <Section title="Targets vs actual">
          {areaTable("HQ_TARGETS", data.targets, r => cfg.business.test(r.Business || ""), ["Metric", "Target", "Actual", "Variance", "Variance %", "YoY %", "Owner"], { Business: cfg.label })}
        </Section>
      </>
    );
  }

  function renderAreaTab(viewId: string, cfg: AreaPage, tab: string) {
    const belongs = (r: SheetRow) => cfg.business.test(r.Business || "");
    const defaults = { Business: cfg.label };
    switch (tab) {
      case "summary": return areaSummaryTab(viewId, cfg);
      case "tasks": return areaTasksTab(viewId, cfg);
      case "pipeline": return gardeniaPipelineTab();
      case "closing": return areaClosingTab(cfg);
      case "kpi": return areaKpiTab(viewId, cfg);
      case "product": return <Section title="Product & Pricing">{edt("HQ_GARDENIA_PRODUCT", data.gardeniaProduct, ["Product / Test", "Test Status", "Unit Cost", "Price", "Target Margin", "Actual Margin", "Owner"])}</Section>;
      case "register": return <Section title="Finance Register">{edt("HQ_FINANCE_REGISTER", data.financeReg, ["Register Type", "Entity / Property", "Account / Policy / Vendor / Tax", "Status", "Amount / Balance", "Due / Next Date", "Owner"])}</Section>;
      case "budgets": return <Section title="Budgets">{edt("HQ_BUDGETS", data.budgets, ["Year", "Month", "Business", "Revenue Budget", "Net Profit Budget", "Owner"])}</Section>;
      case "checklists": return (
        <>
          <Section title="Checklist Runs">{areaTable("HQ_CHECKLIST_RUNS", data.checklistRuns, belongs, ["Checklist Name", "Period Key", "Status", "Completion %", "On Time?", "Owner"], defaults)}</Section>
          <Section title="Checklist Definitions">{areaTable("HQ_CHECKLIST_DEFS", data.checklistDefs, belongs, ["Checklist ID", "Area", "Checklist Name", "Cadence", "Active?"], defaults)}</Section>
        </>
      );
      case "customers": return (
        <>
          <Section title="Customers">{areaTable("HQ_CUSTOMERS", data.customers, belongs, ["Date", "Customer", "Type", "Revenue", "Relationship Stage", "Next Action", "Owner"], defaults)}</Section>
          {viewId === "gardenia"
            ? <Section title="Follow-ups">{areaTable("HQ_CUSTOMER_FOLLOWUP", data.customerFollowup, belongs, ["Follow-up ID", "Customer / Recipient", "Priority", "Due", "Status", "Next Action", "Owner"], defaults)}</Section>
            : <Section title="Reviews">{areaTable("HQ_REVIEWS", data.reviews, belongs, ["Date", "Platform", "Rating", "Theme", "Severity", "Response Status", "Owner"], defaults)}</Section>}
          <Section title="Customer Issues">{areaTable("HQ_CUSTOMER_ISSUES", data.customerIssues, belongs, ["Date", "Issue Type", "Customer", "Severity", "Recovery / Action", "Status", "Owner"], defaults)}</Section>
        </>
      );
      default: return null;
    }
  }

  function renderAreaPage(viewId: string) {
    const cfg = AREA_PAGES[viewId];
    const tab = cfg.tabs.some(t => t.id === areaTab[viewId]) ? areaTab[viewId] : "summary";
    return (
      <>
        <Header title={cfg.title} subtitle={cfg.subtitle} data={data} />
        <div className="chips area-switcher">
          {cfg.tabs.map(t => (
            <button key={t.id} className={`chip ${tab === t.id ? "selected" : ""}`} onClick={() => setAreaTab(cur => ({ ...cur, [viewId]: t.id }))}>{t.label}</button>
          ))}
        </div>
        {renderAreaTab(viewId, cfg, tab)}
      </>
    );
  }

  function renderView() {
    if (loading) return <div className="card loading-state">Connecting to the management system...</div>;
    if (error) return <div className="card error-state">{error}</div>;

    switch (view) {
      case "home": return <Home data={data} onSave={saveRow} onDelete={deleteWorkItem} />;

      case "work": return (
        <>
          <Header title="My Work" subtitle="This week · today · waiting · blocked" data={data} />
          <StatusSummary rows={data.work} pipeline={WORK_PIPELINE} />
          <section className="card">
            <div className="list-toolbar">
              <span className="sub">{data.work.filter(r => !closed(r.Status)).length} active work items</span>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div className="chips">
                  <button className={`chip ${workBoardView ? "selected" : ""}`} onClick={() => setWorkBoardView(true)}>▤ Board</button>
                  <button className={`chip ${!workBoardView ? "selected" : ""}`} onClick={() => setWorkBoardView(false)}>☰ List</button>
                </div>
                <button className="btn primary" onClick={() => nav("add")}>＋ Capture work</button>
              </div>
            </div>
            {workBoardView ? (
              <KanbanBoard
                rows={data.work}
                pipeline={WORK_PIPELINE}
                onMove={(row, status) => saveRow({ id: row.ID, type: "work", status }, `Moved to ${status}`)}
                renderCard={row => <WorkKanbanCard row={row} onSave={saveRow} onDelete={deleteWorkItem} />}
              />
            ) : (
              data.work.map(r => <WorkRow row={r} onSave={saveRow} onDelete={deleteWorkItem} key={r.ID} />)
            )}
          </section>
        </>
      );

      case "operate": return (
        <>
          <Header title="Operate" subtitle="Function / project drill-down" data={data} />
          <div className="chips area-switcher">
            {functions.map(name => <button className={`chip ${selectedFunction === name ? "selected" : ""}`} onClick={() => setSelectedFunction(name)} key={name}>{name}</button>)}
          </div>
          <section className="card">{visibleWork.map(r => <WorkRow row={r} onSave={saveRow} onDelete={deleteWorkItem} key={r.ID} />)}</section>
        </>
      );

      case "manage": return (
        <>
          <Header title="Manage" subtitle="Plans, periods and requests" data={data} />
          <Section title="Plans">{edt("HQ_PLANS", data.plans, ["Plan ID", "Business / Area", "Objective / Priority", "Owner", "Status", "Due", "Result"])}</Section>
          <Section title="Periods">{edt("HQ_PERIODS", data.periods, ["Period Key", "Period Type", "Year", "Week", "Status", "Completion %"])}</Section>
          <Section title="Requests">{edt("HQ_REQUESTS", data.requests, ["Request ID", "Date", "Business / Area", "Request Type", "Request / Issue", "Severity / Urgency", "Status", "Owner"])}</Section>
        </>
      );

      case "close": return (
        <>
          <Header title="Close / Review" subtitle="Complete the control once. Escalate the exception." data={data} />
          <Section title="Weekly Controls">
            <section className="control-grid">{data.controls.map(r => <ControlRow row={r} onSave={saveRow} onDelete={deleteControlItem} key={r.ID} />)}</section>
          </Section>
          <Section title="Checklist Runs">{edt("HQ_CHECKLIST_RUNS", data.checklistRuns, ["Run ID", "Checklist Name", "Business", "Period Key", "Status", "Completion %", "On Time?", "Owner"])}</Section>
          <Section title="Checklist Definitions">{edt("HQ_CHECKLIST_DEFS", data.checklistDefs, ["Checklist ID", "Business", "Area", "Checklist Name", "Cadence", "Active?"])}</Section>
        </>
      );

      case "intel": return (
        <>
          <Header title="Intelligence" subtitle="KSIs, targets, budgets and performance" data={data} />
          <Section title="Key Status Indicators">{edt("HQ_KSI", data.ksi, ["Business / Area", "Metric / Indicator", "Current", "Status", "Threshold / Target", "Direction", "Owner"])}</Section>
          <Section title="Targets">{edt("HQ_TARGETS", data.targets, ["Business", "Metric", "Target", "Actual", "Variance", "Variance %", "YoY %", "Owner"])}</Section>
          <Section title="Budgets">{edt("HQ_BUDGETS", data.budgets, ["Year", "Month", "Business", "Revenue Budget", "Gross Profit Budget", "Net Profit Budget", "Owner"])}</Section>
        </>
      );

      case "customers": return (
        <>
          <Header title="Customers" subtitle="Customers, issues, follow-ups and reviews" data={data} />
          <Section title="Customers">{edt("HQ_CUSTOMERS", data.customers, ["Date", "Business", "Customer", "Type", "Revenue", "Relationship Stage", "Next Action", "Owner"])}</Section>
          <Section title="Customer Issues">{edt("HQ_CUSTOMER_ISSUES", data.customerIssues, ["Date", "Business", "Issue Type", "Customer", "Severity", "Recovery / Action", "Status", "Owner"])}</Section>
          <Section title="Customer Follow-ups">{edt("HQ_CUSTOMER_FOLLOWUP", data.customerFollowup, ["Follow-up ID", "Business", "Customer / Recipient", "Priority", "Due", "Status", "Next Action", "Owner"])}</Section>
          <Section title="Reviews">{edt("HQ_REVIEWS", data.reviews, ["Date", "Business", "Platform", "Rating", "Theme", "Severity", "Response Status", "Owner"])}</Section>
        </>
      );

      case "decisions": return (
        <>
          <Header title="Decisions" subtitle="Decisions made and open exceptions" data={data} />
          <Section title="Decisions">{edt("HQ_DECISIONS", data.decisions, ["Decision ID", "Date", "Business / Area", "Decision", "Owner", "Status", "Due", "Result / Follow-up"])}</Section>
          <Section title="Exceptions">{edt("HQ_EXCEPTIONS", data.exceptions, ["Exception ID", "Date", "Business / Area", "Exception", "Severity", "Owner", "Status", "Due"])}</Section>
        </>
      );

      case "store":
      case "gardenia":
      case "finance":
      case "iron": return renderAreaPage(view);
      case "property": return (
        <>
          <Header title="Buyahka / Property" subtitle="Property items, renewals and next actions" data={data} />
          <StatusSummary rows={visibleWork} pipeline={WORK_PIPELINE} />
          {workItemsBoard(visibleWork)}
          <Section title="Property Register">{edt("HQ_PROPERTY", data.property, ["Property", "Category", "Item", "Status", "Amount", "Due / Renewal", "Owner", "Next Action"])}</Section>
        </>
      );

      case "people": return (
        <>
          <Header title="People & Systems" subtitle="Team, training and system access" data={data} />
          <StatusSummary rows={visibleWork} pipeline={WORK_PIPELINE} />
          {workItemsBoard(visibleWork)}
          <Section title="People">{edt("HQ_PEOPLE", data.people, ["Name", "Role", "Function / Area", "Availability", "Coverage Status", "Training Status", "Active?"])}</Section>
          <Section title="Training">{edt("HQ_TRAINING", data.training, ["Business / Area", "Role / Person", "Capability / Training", "Required?", "Status", "Due", "Owner"])}</Section>
          <Section title="System Access">{edt("HQ_SYSTEM_ACCESS", data.systemAccess, ["System / Account", "User / Role", "Access Level", "Status", "Owner / Admin", "Last Verified"])}</Section>
        </>
      );

      case "personal": return (
        <>
          <Header title="Personal / Ahmad" subtitle="Personal register and open work" data={data} />
          <StatusSummary rows={visibleWork} pipeline={WORK_PIPELINE} />
          {workItemsBoard(visibleWork)}
          <Section title="Personal Register">{edt("HQ_PERSONAL_REGISTER", data.personalReg, ["Register Type", "Item / Account / Policy", "Status", "Amount", "Expected / Renewal / Due", "Owner", "Exception?"])}</Section>
        </>
      );

      case "firefliesLegacy": return (
        <>
          <Header title="Fireflies & Legacy" subtitle="Video, brand and delivery work — scope, links, feedback and completion" data={data} />
          <StatusSummary rows={data.firefliesLegacy} pipeline={WORK_PIPELINE} />
          <section className="card">
            <div className="list-toolbar">
              <span className="sub">{data.firefliesLegacy.length} tasks</span>
              <div className="chips">
                <button className={`chip ${backlogBoardView ? "selected" : ""}`} onClick={() => setBacklogBoardView(true)}>▤ Board</button>
                <button className={`chip ${!backlogBoardView ? "selected" : ""}`} onClick={() => setBacklogBoardView(false)}>☰ List</button>
              </div>
            </div>
            {backlogBoardView ? (
              <KanbanBoard
                rows={data.firefliesLegacy}
                pipeline={WORK_PIPELINE}
                onMove={(row, status) => updateAnyRow("HQ_FIREFLIES_LEGACY", row.ID, { Status: status }, `Moved to ${status}`)}
                renderCard={row => (
                  <GenericKanbanCard
                    row={row}
                    sheetName="HQ_FIREFLIES_LEGACY"
                    titleField="Clinton Task"
                    subtitleFields={["Mini Project", "Timing"]}
                    pipeline={WORK_PIPELINE}
                    onUpdate={updateAnyRow}
                    onDelete={deleteAnyRow}
                  />
                )}
              />
            ) : (
              edt("HQ_FIREFLIES_LEGACY", data.firefliesLegacy, ["ID", "Mini Project", "Clinton Task", "Priority", "Status", "Reviewer / Approver", "Timing", "Owner"])
            )}
          </section>
        </>
      );

      case "add": {
        const activityHistory = [...data.activity]
          .filter(r => r["Action Type"] === "Task Assigned")
          .sort((a, b) => new Date(b.Timestamp || 0).getTime() - new Date(a.Timestamp || 0).getTime());
        return (
          <>
            <Header title="Capture / Inbox" subtitle="Describe a task, pick who it's for, and it's routed straight into that area's own board." data={data} />
            <form className="card form-grid" onSubmit={assignTask}>
              <label className="full">Task description<textarea name="description" required placeholder="What needs to happen?" rows={3} /></label>
              <label>Area
                <select name="area" required key={captureArea} defaultValue={captureArea}>
                  <option value="" disabled>Choose an area…</option>
                  {Object.entries(CAPTURE_ROUTES).map(([key, route]) => <option key={key} value={key}>{route.label}</option>)}
                </select>
              </label>
              <label>Assigned to
                <input name="assignee" list="assignee-options" placeholder="Ahmad" />
                <datalist id="assignee-options">
                  {data.people.map(p => p.Name ? <option key={p.Name} value={p.Name} /> : null)}
                </datalist>
              </label>
              <label>Priority
                <select name="priority" defaultValue="">
                  <option value="">—</option>
                  <option value="P0">P0</option>
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                </select>
              </label>
              <label>Due<input name="due" placeholder="Friday, 12 Sep" /></label>
              <button className={`btn primary${assigning ? " is-pending" : ""}`} type="submit" disabled={assigning} aria-busy={assigning}>
                {assigning && <span className="spinner" aria-hidden="true" />}
                {assigning ? "Assigning…" : "Assign task"}
              </button>
            </form>
            <Section title="Assignment History">
              {activityHistory.length ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead><tr>{["Timestamp", "Business / Area", "Detail", "Actions"].map(h => <th key={h} style={{ padding: "6px 10px", background: "#173B5B", color: "#fff", textAlign: "left" }}>{h}</th>)}</tr></thead>
                    <tbody>{activityHistory.map((r, i) => (
                      <tr key={i} style={{ background: i % 2 ? "#f8f9fb" : "#fff", borderBottom: "1px solid #e8eaf0" }}>
                        <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>{r.Timestamp ? new Date(r.Timestamp).toLocaleString() : "—"}</td>
                        <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>{r["Business / Area"] || "—"}</td>
                        <td style={{ padding: "6px 10px" }}>{r.Detail || "—"}</td>
                        <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                          <AsyncButton
                            className="link-button"
                            style={{ color: "#ae493e" }}
                            pendingLabel="Deleting…"
                            onClick={async () => { if (confirm("Delete this history entry? This cannot be undone.")) await deleteAnyRow("HQ_ACTIVITY", r.Timestamp); }}
                          >
                            Delete
                          </AsyncButton>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <p className="sub">Nothing assigned yet — tasks you route above will show up here.</p>}
            </Section>
          </>
        );
      }

      case "newSheet": return (
        <>
          <Header title="New Register" subtitle="Create a new tracked sheet — it shows up in the sidebar immediately, no code changes needed." data={data} />
          <section className="card">
            <NewSheetForm onCreate={async (label, columns) => {
              const name = await createSheet(label, columns);
              if (name) { setSelectedCustomSheet(name); setView("custom"); }
              return name;
            }} />
          </section>
        </>
      );

      case "custom": {
        const def = data.customSheetDefs.find(d => d.name === selectedCustomSheet);
        return (
          <>
            <Header title={def?.label || "Register"} subtitle="Custom register" data={data} />
            {data.customSheetDefs.length > 1 && (
              <div className="chips area-switcher">
                {data.customSheetDefs.map(d => (
                  <button className={`chip ${selectedCustomSheet === d.name ? "selected" : ""}`} onClick={() => setSelectedCustomSheet(d.name)} key={d.name}>{d.label}</button>
                ))}
              </div>
            )}
            <Section title={def?.label || "Records"}>
              {def ? edt(def.name, data.customSheets[def.name] || [], undefined, def.columns) : <p className="sub">Register not found.</p>}
            </Section>
          </>
        );
      }

      default: return <p className="sub">View not found.</p>;
    }
  }

  const runMaintenance = async () => {
    if (!confirm("Generate missing daily/weekly/monthly checklists?")) return;
    const res = await tracked(() => call("/api/hq/maintenance", { method: "POST" }));
    const payload = await res?.json().catch(() => null);
    if (payload?.ok) {
      notify(`Maintenance complete — generated ${payload.generatedCount} new checklists. Refreshing…`);
      setTimeout(() => window.location.reload(), 1500);
    } else {
      notify(`Maintenance failed: ${payload?.error || "could not reach the server"}`, "error");
    }
  };

  return (
    <main className="system-shell">
      <aside>
        <div className="brand-mark">AHMAD HQ<small>Management System</small></div>
        <div className="motto">Plan · Execute · Monitor<br />Close · Improve</div>
        <div className="nav-label">MAIN</div>
        <nav>
          {mainNav.map(([id, label, icon]) => (
            <button className={view === id ? "active" : ""} key={id} onClick={() => nav(id)}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="nav-label">QUICK</div>
        <nav>
          <button onClick={() => nav("add")}><span>＋</span>Capture / Inbox</button>
          <button onClick={() => nav("customers")}><span>⌕</span>Customers</button>
          <button onClick={() => nav("decisions")}><span>◆</span>Decisions</button>
          <button onClick={() => nav("newSheet")}><span>▦</span>New Register</button>
        </nav>
        {data.customSheetDefs.length > 0 && (
          <>
            <div className="nav-label">YOUR REGISTERS</div>
            <nav>
              {data.customSheetDefs.map(d => (
                <button
                  className={view === "custom" && selectedCustomSheet === d.name ? "active" : ""}
                  key={d.name}
                  onClick={() => { setSelectedCustomSheet(d.name); nav("custom"); }}
                >
                  <span>▤</span>{d.label}
                </button>
              ))}
            </nav>
          </>
        )}
        <div className="user-panel">
          <b>{session?.user?.name || "Loading..."}</b>
          <small>{session?.user?.role || "Unknown Role"}</small>
          <AsyncButton className="link-button" pendingLabel="Running…" onClick={runMaintenance} style={{ marginTop: 8, padding: 0 }}>Run Maintenance</AsyncButton>
          <button className="link-button" onClick={() => setShowGuide(true)} style={{ marginTop: 8, padding: 0, marginLeft: 12 }}>? Guide</button>
          <button className="link-button" onClick={() => signOut()} style={{ marginTop: 8, padding: 0, marginLeft: 12 }}>Sign Out</button>
        </div>
      </aside>
      <main className="main-content">
        {renderView()}
      </main>
      {showGuide && <GuideTour onClose={dismissGuide} />}
      <FeedbackHost />
    </main>
  );
}

// Map sheet names → local state keys for optimistic UI updates
const sheetToKey: Record<string, string> = {
  HQ_TARGETS: "targets", HQ_BUDGETS: "budgets", HQ_CUSTOMERS: "customers",
  HQ_CUSTOMER_ISSUES: "customerIssues", HQ_CUSTOMER_FOLLOWUP: "customerFollowup",
  HQ_REVIEWS: "reviews", HQ_DECISIONS: "decisions", HQ_EXCEPTIONS: "exceptions",
  HQ_PLANS: "plans", HQ_PEOPLE: "people", HQ_KSI: "ksi",
  HQ_GARDENIA_PIPELINE: "gardeniaPipeline", HQ_GARDENIA_PRODUCT: "gardeniaProduct",
  HQ_GARDENIA_TASKS: "gardeniaTasks", HQ_IRONMARK_TASKS: "ironTasks",
  HQ_CHECKLIST_DEFS: "checklistDefs", HQ_CHECKLIST_RUNS: "checklistRuns",
  HQ_ALERTS: "alerts", HQ_PROPERTY: "property",
  HQ_FINANCE_REGISTER: "financeReg",
  HQ_PERSONAL_REGISTER: "personalReg", HQ_REQUESTS: "requests",
  HQ_TRAINING: "training", HQ_SYSTEM_ACCESS: "systemAccess",
  HQ_PERIODS: "periods", HQ_NOTES: "notes", HQ_ACTIVITY: "activity",
  HQ_FIREFLIES_LEGACY: "firefliesLegacy",
};
