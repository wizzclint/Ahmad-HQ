"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { HqBootstrap, SheetRow } from "@/lib/hq-types";
import { functions } from "@/lib/hq-types";

type View =
  | "home" | "work" | "operate" | "manage" | "close" | "intel"
  | "customers" | "decisions" | "add"
  | "store" | "edible" | "gardenia" | "finance" | "legacy"
  | "property" | "people" | "podcast" | "personal" | "iron"
  | "techBacklog" | "custom" | "newSheet";

const emptyData: HqBootstrap = {
  work: [], controls: [], user: "", generatedAt: "", source: "demo",
  targets: [], budgets: [], customers: [], customerIssues: [], customerFollowup: [],
  reviews: [], decisions: [], exceptions: [], plans: [], people: [], ksi: [],
  gardeniaPipeline: [], gardeniaProduct: [], checklistDefs: [], checklistRuns: [],
  legacy: [], alerts: [], property: [], financeReg: [], podcast: [], personalReg: [],
  requests: [], training: [], systemAccess: [], periods: [], notes: [], activity: [],
  techBacklog: [], customSheetDefs: [], customSheets: {},
};

const closed = (v = "") => /done|complete|closed/i.test(v);
const isException = (row: SheetRow) =>
  row["Management Escalation?"] === "Yes" || row["Blocked?"] === "Yes" || row["Exception?"] === "Yes";

// ── Kanban status buckets ──────────────────────────────────────────────────
// Normalizes whatever raw Status text a sheet happens to use ("Open",
// "Not Started", "Blocked", "Waiting On Ahmad"...) into one of 4 pipeline
// stages, so different registers can share the same board shape.
type Bucket = "todo" | "pending" | "inProgress" | "completed";
const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "pending", label: "Pending" },
  { id: "inProgress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];
function statusBucket(status?: string): Bucket {
  const s = (status || "").toLowerCase();
  if (/done|complete/.test(s)) return "completed";
  if (/progress/.test(s)) return "inProgress";
  if (/block|wait|hold|pending/.test(s)) return "pending";
  return "todo";
}

// ── Generic editable data table ───────────────────────────────────────────────
function EditableDataTable({
  rows, sheetName, priorityCols, columns, onUpdate, onAdd, onDelete,
}: {
  rows: SheetRow[];
  sheetName: string;
  priorityCols?: string[];
  /** Explicit header list — needed for a brand-new sheet with zero rows yet, since headers can't be inferred from data. */
  columns?: string[];
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
    } finally { setSaving(false); }
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      await onAdd(sheetName, newRow);
      setAdding(false);
      setNewRow({});
    } finally { setSaving(false); }
  };

  const handleDelete = async (idx: number) => {
    const id = rows[idx][headers[0]];
    if (!confirm(`Delete this record${id ? ` (${id})` : ""}? This cannot be undone.`)) return;
    setSaving(true);
    try { await onDelete(sheetName, id); } finally { setSaving(false); }
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
                        <input
                          value={editValues[h] ?? ""}
                          onChange={e => setEditValues(v => ({ ...v, [h]: e.target.value }))}
                          style={{ width: "100%", fontSize: "0.82rem", padding: "2px 4px", border: "1px solid #c0c8d8", borderRadius: 3 }}
                        />
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
                      <button className="link-button" style={{ fontSize: "0.75rem", marginLeft: 8, color: "#ae493e" }} onClick={() => handleDelete(i)} disabled={saving}>Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {adding && (
              <tr style={{ background: "#eef4ff", borderBottom: "1px solid #c0c8d8" }}>
                {showCols.map(h => (
                  <td key={h} style={{ padding: "4px 6px" }}>
                    <input
                      placeholder={h}
                      value={newRow[h] ?? ""}
                      onChange={e => setNewRow(v => ({ ...v, [h]: e.target.value }))}
                      style={{ width: "100%", fontSize: "0.82rem", padding: "2px 4px", border: "1px solid #c0c8d8", borderRadius: 3 }}
                    />
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
        {!adding && <button className="btn" style={{ fontSize: "0.78rem", padding: "3px 10px" }} onClick={() => setAdding(true)}>＋ Add row</button>}
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
  const text = value || "Open";
  const tone = closed(text) ? "good" : /blocked|exception|high/i.test(text) ? "bad" : /progress|wait/i.test(text) ? "warn" : "";
  return <span className={`badge ${tone}`}>{text}</span>;
}

function WorkRow({ row, onSave, onDelete }: { row: SheetRow; onSave: (u: SheetRow) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [update, setUpdate] = useState<SheetRow>({ id: row.ID, type: "work", status: row.Status, waitingOn: row["Waiting On"], blocked: row["Blocked?"], result: row["Result / Completion Note"], evidence: row["Evidence / Drive Link"], why: row["WHY / OUTCOME SUPPORTED"] });
  const handleDelete = () => {
    if (confirm(`Delete "${row["Work Item / Next Action"] || row.ID}"? This cannot be undone.`)) onDelete(row.ID);
  };
  return (
    <article className="task-row">
      {editing ? (
        <div className="edit-fields">
          <select value={update.status} onChange={e => setUpdate({ ...update, status: e.target.value })}>
            <option>Open</option><option>In Progress</option><option>Done</option><option>Completed</option><option>Blocked</option>
          </select>
          <input value={update.waitingOn || ""} onChange={e => setUpdate({ ...update, waitingOn: e.target.value })} placeholder="Waiting on" />
          <input value={update.result || ""} onChange={e => setUpdate({ ...update, result: e.target.value })} placeholder="Result / completion note" />
          <input value={update.evidence || ""} onChange={e => setUpdate({ ...update, evidence: e.target.value })} placeholder="Evidence / Drive link" />
          <div className="edit-actions">
            <button className="link-button" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn primary" onClick={async () => { await onSave(update); setEditing(false); }}>Save changes</button>
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
            <button className="link-button" style={{ color: "#ae493e" }} onClick={handleDelete}>Delete</button>
          </div>
        </>
      )}
    </article>
  );
}

function ControlRow({ row, onSave, onDelete }: { row: SheetRow; onSave: (u: SheetRow) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [update, setUpdate] = useState<SheetRow>({ id: row.ID, type: "control", status: row.Status, evidence: row["Evidence / Link"], exception: row["Exception?"], notes: row["Notes / Next Action"] });
  const handleDelete = () => {
    if (confirm(`Delete "${row.Control || row.ID}"? This cannot be undone.`)) onDelete(row.ID);
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
            <button className="btn primary" onClick={async () => { await onSave(update); setEditing(false); }}>Save changes</button>
          </div>
        </div>
      ) : (
        <>
          <div className="control-head">
            <Badge value={row.Status} />
            <div>
              <button className="link-button" onClick={() => setEditing(true)}>Edit</button>
              <button className="link-button" style={{ color: "#ae493e", marginLeft: 10 }} onClick={handleDelete}>Delete</button>
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
  rows, statusField = "Status", bucketStatus, onMove, renderCard,
}: {
  rows: T[];
  statusField?: string;
  /** The Status value to write when a card is dropped into each column. */
  bucketStatus: Record<Bucket, string>;
  onMove: (row: T, newStatus: string) => void;
  renderCard: (row: T) => React.ReactNode;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const idOf = (row: T) => row[Object.keys(row)[0]];

  return (
    <div className="kanban-board">
      {BUCKETS.map(col => {
        const items = rows.filter(r => statusBucket(r[statusField]) === col.id);
        return (
          <div
            key={col.id}
            className="kanban-column"
            onDragOver={e => e.preventDefault()}
            onDrop={() => {
              if (!dragId) return;
              const row = rows.find(r => idOf(r) === dragId);
              if (row && statusBucket(row[statusField]) !== col.id) onMove(row, bucketStatus[col.id]);
              setDragId(null);
            }}
          >
            <div className="kanban-column-header">
              <span>{col.label}</span>
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
  const handleDelete = () => {
    if (confirm(`Delete "${row["Work Item / Next Action"] || row.ID}"? This cannot be undone.`)) onDelete(row.ID);
  };
  if (editing) {
    return (
      <div className="kanban-card">
        <div className="edit-fields kanban-edit-fields">
          <select value={update.status} onChange={e => setUpdate({ ...update, status: e.target.value })}>
            <option>Open</option><option>In Progress</option><option>Done</option><option>Completed</option><option>Blocked</option>
          </select>
          <input value={update.waitingOn || ""} onChange={e => setUpdate({ ...update, waitingOn: e.target.value })} placeholder="Waiting on" />
          <input value={update.result || ""} onChange={e => setUpdate({ ...update, result: e.target.value })} placeholder="Result / completion note" />
          <input value={update.evidence || ""} onChange={e => setUpdate({ ...update, evidence: e.target.value })} placeholder="Evidence / Drive link" />
          <div className="edit-actions">
            <button className="link-button" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn primary" onClick={async () => { await onSave(update); setEditing(false); }}>Save</button>
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
        <button className="link-button" style={{ color: "#ae493e" }} onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
}

function GenericKanbanCard({
  row, sheetName, titleField, subtitleFields, onUpdate, onDelete,
}: {
  row: SheetRow;
  sheetName: string;
  titleField: string;
  subtitleFields: string[];
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

  const handleDelete = () => {
    if (confirm(`Delete "${row[titleField] || id}"? This cannot be undone.`)) onDelete(sheetName, id);
  };

  if (editing) {
    return (
      <div className="kanban-card kanban-card-editing">
        {headers.map(h => (
          <label key={h} className="kanban-field">
            <span>{h}</span>
            <input value={values[h] ?? ""} onChange={e => setValues(v => ({ ...v, [h]: e.target.value }))} />
          </label>
        ))}
        <div className="edit-actions">
          <button className="link-button" onClick={() => { setValues(row); setEditing(false); }}>Cancel</button>
          <button className="btn primary" onClick={handleSave}>Save</button>
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
        <button className="link-button" style={{ color: "#ae493e" }} onClick={handleDelete}>Delete</button>
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
    body: "Each business area — Edible, Gardenia's Fire, Finance & Office, Legacy Closeout, Property, People & Systems, Podcast & Legacy, Personal/Ahmad, Iron Marks — has its own tab. Opening one shows only that area's work items plus the registers specific to it (e.g. Finance & Office shows the Finance Register; Gardenia's Fire shows its Sales Pipeline). Use these when you want to focus on one part of the business instead of everything at once.",
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
  { id: "edible", label: "EDIBLE - MANAGEMENT", icon: "▤", match: ["edible"] },
  { id: "gardenia", label: "GARDENIA'S FIRE", icon: "✿", match: ["gardenia"] },
  { id: "finance", label: "FINANCE & OFFICE", icon: "$", match: ["finance"] },
  { id: "legacy", label: "LEGACY CLOSEOUT", icon: "▣", match: ["legacy"] },
  { id: "property", label: "BUYAHKA / PROPERTY", icon: "▥", match: ["property"] },
  { id: "people", label: "PEOPLE & SYSTEMS", icon: "♟", match: ["people"] },
  { id: "podcast", label: "PODCAST & LEGACY", icon: "◉", match: ["podcast"] },
  { id: "personal", label: "PERSONAL / AHMAD", icon: "●", match: ["personal", "ahmad"] },
  { id: "iron", label: "IRON MARKS", icon: "◇", match: ["iron"] },
];

function Home({ data, onSave, onDelete, navigate }: { data: HqBootstrap; onSave: (u: SheetRow) => Promise<void>; onDelete: (id: string) => Promise<void>; navigate: (v: View) => void }) {
  const open = data.work.filter(r => !closed(r.Status));
  const blocked = open.filter(r => r["Blocked?"] === "Yes");
  const critical = open.filter(r => r["Critical Move?"] === "Yes");
  const escalated = open.filter(r => r["Management Escalation?"] === "Yes");
  const openAlerts = data.alerts.filter(r => !/resolved|closed/i.test(r.Status || ""));
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
      <h2 className="section-title home-band">Operating areas</h2>
      <section className="area-grid">
        {functions.map((name, index) => {
          const rows = data.work.filter(r => r["Project / Function"] === name);
          return (
            <button className={`area-card tone-${index % 5}`} key={name} onClick={() => navigate("operate")}>
              <span className="area-icon">{["🍓", "✿", "$", "◎", "◉", "●"][index]}</span>
              <b>{name}</b>
              <small>{rows.filter(r => !closed(r.Status)).length} open · {rows.filter(isException).length} attention</small>
            </button>
          );
        })}
      </section>
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

  async function saveRow(update: SheetRow) {
    const res = await fetch("/api/hq", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update) });
    if (!res.ok) throw new Error("Save failed");
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

  // Generic update for any HQ_* sheet
  async function updateAnyRow(sheet: string, id: string, changes: Record<string, string>) {
    const res = await fetch("/api/hq", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "generic", sheet, id, changes }),
    });
    if (!res.ok) throw new Error("Save failed");
    updateSheetRows(sheet, rows => rows.map(r => r[Object.keys(r)[0]] === id ? { ...r, ...changes } : r));
  }

  // Generic append for any HQ_* sheet
  async function addAnyRow(sheet: string, row: Record<string, string>) {
    const res = await fetch("/api/hq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "generic", sheet, row }),
    });
    if (!res.ok) throw new Error("Add failed");
    updateSheetRows(sheet, rows => [...rows, row]);
  }

  // Generic delete for any HQ_* sheet
  async function deleteAnyRow(sheet: string, id: string) {
    const res = await fetch("/api/hq", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "generic", sheet, id }),
    });
    if (!res.ok) { setError("Delete failed."); return; }
    updateSheetRows(sheet, rows => rows.filter(r => r[Object.keys(r)[0]] !== id));
  }

  async function deleteWorkItem(id: string) {
    const res = await fetch("/api/hq", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "work", id }) });
    if (!res.ok) { setError("Delete failed."); return; }
    setData(cur => ({ ...cur, work: cur.work.filter(r => r.ID !== id) }));
  }

  async function deleteControlItem(id: string) {
    const res = await fetch("/api/hq", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "control", id }) });
    if (!res.ok) { setError("Delete failed."); return; }
    setData(cur => ({ ...cur, controls: cur.controls.filter(r => r.ID !== id) }));
  }

  // Create a brand-new register sheet — no code change needed for it to show up.
  async function createSheet(label: string, columns: string[]) {
    const res = await fetch("/api/hq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "createSheet", label, columns }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.ok) { setError(payload?.error || "Could not create the new sheet."); return null; }
    setData(cur => ({
      ...cur,
      customSheetDefs: [...cur.customSheetDefs, { name: payload.name, label: payload.label, columns: payload.columns }],
      customSheets: { ...cur.customSheets, [payload.name]: [] },
    }));
    return payload.name as string;
  }

  async function addWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // No client-side ID here — the server is the sole authority for work item IDs (see lib/hq-data.ts nextWorkId).
    const row: SheetRow = { "Project / Function": String(form.get("function") || ""), "Work Item / Next Action": String(form.get("action") || ""), Owner: String(form.get("owner") || "Ahmad"), Status: "Open", "Due Date": String(form.get("due") || "") };
    const res = await fetch("/api/hq", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row) });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.id) { setError("The work item could not be saved."); return; }
    setData(cur => ({ ...cur, work: [{ ...row, ID: payload.id }, ...cur.work] }));
    event.currentTarget.reset();
    setView("work");
  }

  const nav = (v: View) => setView(v);

  const mainNav: [View, string, string][] = [
    ["home", "HOME", "▣"], ["work", "MY WORK", "✓"], ["manage", "MANAGE", "◎"],
    ...areas.map(a => [a.id, a.label, a.icon] as [View, string, string]),
    ["close", "CLOSE / REVIEW", "✓"], ["intel", "INTELLIGENCE", "⌁"],
    ["techBacklog", "TECH BACKLOG", "⚙"],
  ];

  // Helpers for editable tables
  const edt = (sheet: string, rows: SheetRow[], priorityCols?: string[], columns?: string[]) => (
    <EditableDataTable rows={rows} sheetName={sheet} priorityCols={priorityCols} columns={columns} onUpdate={updateAnyRow} onAdd={addAnyRow} onDelete={deleteAnyRow} />
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

  function renderView() {
    if (loading) return <div className="card loading-state">Connecting to the management system...</div>;
    if (error) return <div className="card error-state">{error}</div>;

    switch (view) {
      case "home": return <Home data={data} onSave={saveRow} onDelete={deleteWorkItem} navigate={nav} />;

      case "work": return (
        <>
          <Header title="My Work" subtitle="This week · today · waiting · blocked" data={data} />
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
                bucketStatus={{ todo: "Open", pending: "Blocked", inProgress: "In Progress", completed: "Done" }}
                onMove={(row, status) => saveRow({ id: row.ID, type: "work", status })}
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

      case "gardenia": return (
        <>
          <Header title="Gardenia's Fire" subtitle="Pipeline, product and open work" data={data} />
          <Section title="Work Items">{visibleWork.length ? visibleWork.map(r => <WorkRow row={r} onSave={saveRow} onDelete={deleteWorkItem} key={r.ID} />) : <p className="sub">No work items.</p>}</Section>
          <Section title="Sales Pipeline">{edt("HQ_GARDENIA_PIPELINE", data.gardeniaPipeline, ["Account / Prospect", "Stage", "Contact / Company", "Revenue / Value", "Risk", "Next Follow-up", "Owner"])}</Section>
          <Section title="Product & Pricing">{edt("HQ_GARDENIA_PRODUCT", data.gardeniaProduct, ["Product / Test", "Test Status", "Unit Cost", "Price", "Target Margin", "Actual Margin", "Owner"])}</Section>
        </>
      );

      case "finance": return (
        <>
          <Header title="Finance & Office" subtitle="Finance register, budgets and open work" data={data} />
          <Section title="Work Items">{visibleWork.length ? visibleWork.map(r => <WorkRow row={r} onSave={saveRow} onDelete={deleteWorkItem} key={r.ID} />) : <p className="sub">No work items.</p>}</Section>
          <Section title="Finance Register">{edt("HQ_FINANCE_REGISTER", data.financeReg, ["Register Type", "Entity / Property", "Account / Policy / Vendor / Tax", "Status", "Amount / Balance", "Due / Next Date", "Owner"])}</Section>
          <Section title="Budgets">{edt("HQ_BUDGETS", data.budgets, ["Year", "Month", "Business", "Revenue Budget", "Net Profit Budget", "Owner"])}</Section>
        </>
      );

      case "legacy": return (
        <>
          <Header title="Legacy Closeout" subtitle="Open obligations and closeout status" data={data} />
          <Section title="Work Items">{visibleWork.length ? visibleWork.map(r => <WorkRow row={r} onSave={saveRow} onDelete={deleteWorkItem} key={r.ID} />) : <p className="sub">No work items.</p>}</Section>
          <Section title="Legacy Closeout Register">{edt("HQ_LEGACY_CLOSEOUT", data.legacy, ["Item ID", "Old Company / Entity", "Creditor / Issue", "Amount / Exposure", "Stage", "Risk", "Owner", "Status"])}</Section>
        </>
      );

      case "property": return (
        <>
          <Header title="Buyahka / Property" subtitle="Property items, renewals and next actions" data={data} />
          <Section title="Work Items">{visibleWork.length ? visibleWork.map(r => <WorkRow row={r} onSave={saveRow} onDelete={deleteWorkItem} key={r.ID} />) : <p className="sub">No work items.</p>}</Section>
          <Section title="Property Register">{edt("HQ_PROPERTY", data.property, ["Property", "Category", "Item", "Status", "Amount", "Due / Renewal", "Owner", "Next Action"])}</Section>
        </>
      );

      case "people": return (
        <>
          <Header title="People & Systems" subtitle="Team, training and system access" data={data} />
          <Section title="Work Items">{visibleWork.length ? visibleWork.map(r => <WorkRow row={r} onSave={saveRow} onDelete={deleteWorkItem} key={r.ID} />) : <p className="sub">No work items.</p>}</Section>
          <Section title="People">{edt("HQ_PEOPLE", data.people, ["Name", "Role", "Function / Area", "Availability", "Coverage Status", "Training Status", "Active?"])}</Section>
          <Section title="Training">{edt("HQ_TRAINING", data.training, ["Business / Area", "Role / Person", "Capability / Training", "Required?", "Status", "Due", "Owner"])}</Section>
          <Section title="System Access">{edt("HQ_SYSTEM_ACCESS", data.systemAccess, ["System / Account", "User / Role", "Access Level", "Status", "Owner / Admin", "Last Verified"])}</Section>
        </>
      );

      case "podcast": return (
        <>
          <Header title="Podcast & Legacy" subtitle="Production pipeline and assets" data={data} />
          <Section title="Work Items">{visibleWork.length ? visibleWork.map(r => <WorkRow row={r} onSave={saveRow} onDelete={deleteWorkItem} key={r.ID} />) : <p className="sub">No work items.</p>}</Section>
          <Section title="Podcast Pipeline">{edt("HQ_PODCAST", data.podcast, ["Item ID", "Episode / Asset", "Stage", "Item Type", "Owner", "Due", "Status", "Next Action"])}</Section>
        </>
      );

      case "personal": return (
        <>
          <Header title="Personal / Ahmad" subtitle="Personal register and open work" data={data} />
          <Section title="Work Items">{visibleWork.length ? visibleWork.map(r => <WorkRow row={r} onSave={saveRow} onDelete={deleteWorkItem} key={r.ID} />) : <p className="sub">No work items.</p>}</Section>
          <Section title="Personal Register">{edt("HQ_PERSONAL_REGISTER", data.personalReg, ["Register Type", "Item / Account / Policy", "Status", "Amount", "Expected / Renewal / Due", "Owner", "Exception?"])}</Section>
        </>
      );

      case "store":
      case "edible": return (
        <>
          <Header title={view === "store" ? "Edible - Store" : "Edible - Management"} subtitle="Operations, checklists and open work" data={data} />
          <Section title="Work Items">{visibleWork.length ? visibleWork.map(r => <WorkRow row={r} onSave={saveRow} onDelete={deleteWorkItem} key={r.ID} />) : <p className="sub">No work items.</p>}</Section>
          <Section title="Checklist Runs">{edt("HQ_CHECKLIST_RUNS", data.checklistRuns.filter(r => /edible/i.test(r.Business || "")), ["Checklist Name", "Period Key", "Status", "Completion %", "On Time?", "Owner"])}</Section>
        </>
      );

      case "iron": return (
        <>
          <Header title="Iron Marks" subtitle="Current records" data={data} />
          <Section title="Work Items">{visibleWork.length ? visibleWork.map(r => <WorkRow row={r} onSave={saveRow} onDelete={deleteWorkItem} key={r.ID} />) : <p className="sub">No work items for Iron Marks yet.</p>}</Section>
        </>
      );

      case "techBacklog": return (
        <>
          <Header title="Tech Backlog" subtitle="Technology, design and execution — scope, links, feedback and completion" data={data} />
          <section className="card">
            <div className="list-toolbar">
              <span className="sub">{data.techBacklog.length} tasks</span>
              <div className="chips">
                <button className={`chip ${backlogBoardView ? "selected" : ""}`} onClick={() => setBacklogBoardView(true)}>▤ Board</button>
                <button className={`chip ${!backlogBoardView ? "selected" : ""}`} onClick={() => setBacklogBoardView(false)}>☰ List</button>
              </div>
            </div>
            {backlogBoardView ? (
              <KanbanBoard
                rows={data.techBacklog}
                bucketStatus={{ todo: "Not Started", pending: "Blocked", inProgress: "In Progress", completed: "Completed" }}
                onMove={(row, status) => updateAnyRow("HQ_TECH_BACKLOG", row.ID, { Status: status })}
                renderCard={row => (
                  <GenericKanbanCard
                    row={row}
                    sheetName="HQ_TECH_BACKLOG"
                    titleField="Clinton Task"
                    subtitleFields={["Mini Project", "Timing"]}
                    onUpdate={updateAnyRow}
                    onDelete={deleteAnyRow}
                  />
                )}
              />
            ) : (
              edt("HQ_TECH_BACKLOG", data.techBacklog, ["ID", "Mini Project", "Clinton Task", "Priority", "Status", "Reviewer / Approver", "Timing", "Owner"])
            )}
          </section>
        </>
      );

      case "add": return (
        <>
          <Header title="Capture / Inbox" subtitle="Turn a thought, request, or next action into a managed record." data={data} />
          <form className="card form-grid" onSubmit={addWork}>
            <label>Function / project<input name="function" required placeholder="e.g. Finance & Office" /></label>
            <label>Owner<input name="owner" placeholder="Ahmad" /></label>
            <label className="full">Next action<input name="action" required placeholder="What is the next executable step?" /></label>
            <label>Due<input name="due" placeholder="Friday, 12 Sep" /></label>
            <button className="btn primary" type="submit">Capture work</button>
          </form>
        </>
      );

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
    try {
      const res = await fetch("/api/hq/maintenance", { method: "POST" });
      const payload = await res.json();
      if (payload.ok) {
        alert(`Maintenance complete. Generated ${payload.generatedCount} new checklists.`);
        window.location.reload();
      } else {
        alert("Maintenance failed: " + (payload.error || "Unknown error"));
      }
    } catch (e) {
      alert("Error running maintenance");
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
          <button className="link-button" onClick={runMaintenance} style={{ marginTop: 8, padding: 0 }}>Run Maintenance</button>
          <button className="link-button" onClick={() => setShowGuide(true)} style={{ marginTop: 8, padding: 0, marginLeft: 12 }}>? Guide</button>
          <button className="link-button" onClick={() => signOut()} style={{ marginTop: 8, padding: 0, marginLeft: 12 }}>Sign Out</button>
        </div>
      </aside>
      <main className="main-content">
        {renderView()}
      </main>
      {showGuide && <GuideTour onClose={dismissGuide} />}
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
  HQ_CHECKLIST_DEFS: "checklistDefs", HQ_CHECKLIST_RUNS: "checklistRuns",
  HQ_LEGACY_CLOSEOUT: "legacy", HQ_ALERTS: "alerts", HQ_PROPERTY: "property",
  HQ_FINANCE_REGISTER: "financeReg", HQ_PODCAST: "podcast",
  HQ_PERSONAL_REGISTER: "personalReg", HQ_REQUESTS: "requests",
  HQ_TRAINING: "training", HQ_SYSTEM_ACCESS: "systemAccess",
  HQ_PERIODS: "periods", HQ_NOTES: "notes", HQ_ACTIVITY: "activity",
  HQ_TECH_BACKLOG: "techBacklog",
};
