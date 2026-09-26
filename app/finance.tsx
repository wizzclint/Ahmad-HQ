"use client";

import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { SheetRow } from "@/lib/hq-types";
import { APP_SHEETS } from "@/lib/hq-schemas";
import {
  FILTERS, FIN_TYPES, ITEMS_SHEET, PAYMENT_METHODS,
  activityRow, dueState, financeTotals, inUrgencyOrder, isOpen, itemError, itemRow, itemWarnings, itemsFrom, matchesFilter, matchesSearch,
  money, needsPaying, numbersLine, paymentError, paymentRow, paymentWarnings, typeInfo, weekPayments, weekWrapUp,
  type FinFilter, type FinItem, type FinanceTotals, type ItemValues, type PaymentValues,
} from "@/lib/hq-finance";
import { dayLabel, findDate, isoDay, quickDates, todayUTC, weekSpan } from "@/lib/hq-pipeline";
import { Modal } from "./modal";

// Finance & Office "Bills & payments", in one place so the tabs work as one system:
//  - <FinanceWorkspace> owns the items (what arrives), their payments, and the dialogs (intake, an item's card,
//    record a payment), so the Summary, Tasks, Bills & Payments and Weekly Closing tabs can all open them;
//  - the Bills & Payments tab, the Summary panel, the "Payments to make" list for the Tasks tab, and the guided closing.
// The page supplies the saving (see FinanceActions), so this file never talks to the API.

export type FinanceActions = {
  addItem: (row: Record<string, string>) => Promise<void>;
  updateItem: (key: string, changes: Record<string, string>, message?: string) => Promise<void>;
  /** Removes the item and the payments recorded on it. */
  deleteItem: (key: string) => Promise<void>;
  addPayment: (row: Record<string, string>) => Promise<void>;
  deletePayment: (key: string) => Promise<void>;
  /** Best-effort history entry: a failure must not undo the change that was already saved. */
  logActivity: (row: Record<string, string>) => void;
  newId: (prefix: "F" | "P") => string;
};

type Dialog = { kind: "view" | "edit" | "pay"; key: string } | { kind: "add" };

type Workspace = {
  items: FinItem[];
  totals: FinanceTotals;
  now: number;
  today: Date;
  owners: string[];
  entities: string[];
  me: string;
  myOwner: string;
  actions: FinanceActions;
  open: (d: Dialog) => void;
  close: () => void;
};

const WorkspaceContext = createContext<Workspace | null>(null);
function useFinance(): Workspace {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("Finance components must be rendered inside <FinanceWorkspace>.");
  return ctx;
}

const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? "";
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const shortDay = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const URL_ONLY = /^https?:\/\/\S+$/i;

// ── Small pieces used everywhere ─────────────────────────────────────────────

function dueText(i: FinItem, today: Date): { cls: string; text: string } {
  if (i.state === "cancelled") return { cls: "muted", text: "Cancelled" };
  if (i.state === "paid") return { cls: "paid", text: i.overpaid ? `Paid · ${money(i.overpaid)} over` : "Paid in full" };
  if (i.state === "done") return { cls: "paid", text: "Done" };
  const { state, days } = dueState(i, today);
  if (state === "overdue") return { cls: "overdue", text: `Overdue ${plural(-(days ?? 0), "day")}` };
  if (state === "today") return { cls: "today", text: "Due today" };
  if (state === "week") return { cls: "week", text: `Due ${shortDay(i.due as Date)}` };
  if (state === "later") return { cls: "", text: `Due ${dayLabel(i.due as Date)}` };
  return { cls: "", text: "No due date" };
}

function DueChip({ item, today }: { item: FinItem; today: Date }) {
  const d = dueText(item, today);
  return <span className={`due-chip ${d.cls}`}>{d.text}</span>;
}

/** How much of a bill is paid. It fills as payments are recorded and turns green when the bill is paid off. */
function ProgressBar({ item, today }: { item: FinItem; today: Date }) {
  if (item.pct === null || item.amount === null) return null;
  const pct = item.state === "paid" ? 100 : Math.min(99, Math.floor(item.pct * 100));
  const late = item.state !== "paid" && dueState(item, today).state === "overdue";
  return (
    <div className={`fin-progress ${item.state}${late ? " late" : ""}`}>
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${item.title}: ${pct}% paid`}><span style={{ width: `${pct}%` }} /></div>
      <small>
        {money(item.paid)} of {money(item.amount)} paid
        {item.state === "paid" ? (item.overpaid ? ` · ${money(item.overpaid)} over` : "") : ` · ${money(item.remaining ?? 0)} left`}
      </small>
    </div>
  );
}

function ItemName({ item }: { item: FinItem }) {
  const ws = useFinance();
  return (
    <>
      <button type="button" className="acct-name" onClick={() => ws.open({ kind: "view", key: item.key })}>{item.title}</button>{" "}
      <span className="type-chip">{item.type || "Item"}</span>
      {item.last4 && <span className="fin-last4" title="Last 4 digits"> ···{item.last4}</span>}
    </>
  );
}

// ── The shared workspace ─────────────────────────────────────────────────────

export function FinanceWorkspace({ items: itemRows, payments: paymentRows, entities: extraEntities, owners, me, actions, children }: {
  /** HQ_FINANCE_ITEMS. */
  items: SheetRow[];
  /** HQ_FINANCE_PAYMENTS. */
  payments: SheetRow[];
  /** Business names already used elsewhere (offered when typing an item's entity). */
  entities: string[];
  owners: string[];
  /** The signed-in person's name. */
  me: string;
  actions: FinanceActions;
  children: ReactNode;
}) {
  const items = useMemo(() => itemsFrom(itemRows, paymentRows), [itemRows, paymentRows]);
  const [now, setNow] = useState(() => Date.now()); // read once so rendering stays pure; refreshed when the tab is looked at again
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const today = useMemo(() => todayUTC(now), [now]);
  const totals = useMemo(() => financeTotals(items, today), [items, today]);
  const entities = useMemo(() => [...new Set([...items.map(i => i.entity), ...extraEntities].map(s => s.trim()).filter(Boolean))].sort(), [items, extraEntities]);
  const myOwner = useMemo(() => {
    const first = firstName(me).toLowerCase();
    return first.length >= 2 ? owners.find(o => o.toLowerCase().includes(first)) ?? "" : "";
  }, [me, owners]);
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const value: Workspace = { items, totals, now, today, owners, entities, me, myOwner, actions, open: setDialog, close: () => setDialog(null) };

  const item = dialog && "key" in dialog ? items.find(i => i.key === dialog.key) ?? null : null;
  const done = () => setDialog(null);
  let modal: ReactNode = null;
  if (dialog?.kind === "add") {
    modal = <Modal key="add" title="Add an item" onClose={done}><ItemForm onClose={done} onSaved={key => setDialog({ kind: "view", key })} /></Modal>;
  } else if (dialog && item) {
    const k = dialog.kind;
    modal = (
      <Modal key={`${k}-${item.key}`} title={k === "view" ? item.title : k === "edit" ? `Edit ${item.title}` : `Record a payment · ${item.title}`} onClose={done}>
        {k === "view" && <ItemView item={item} />}
        {k === "edit" && <ItemForm item={item} onClose={() => setDialog({ kind: "view", key: item.key })} onSaved={key => setDialog({ kind: "view", key })} />}
        {k === "pay" && <PaymentForm item={item} onClose={done} />}
      </Modal>
    );
  }

  return <WorkspaceContext.Provider value={value}>{children}{modal}</WorkspaceContext.Provider>;
}

// ── One item: its details, its progress and every payment ────────────────────

function ItemView({ item }: { item: FinItem }) {
  const ws = useFinance();
  const info = typeInfo(item.type);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch {
      // the page already showed an error toast
    } finally {
      setBusy(false);
    }
  };
  const setStatus = (status: string, message: string) => run(() => ws.actions.updateItem(item.key, { Status: status }, message));
  const remove = () => {
    const n = item.payments.length;
    if (busy || !confirm(`Delete “${item.title}”${n ? ` and its ${plural(n, "payment record")}` : ""}? This cannot be undone.${n ? "\n\nIf the bill was only paid or cancelled, use “Cancel this item” instead so the history is kept." : ""}`)) return;
    return run(async () => { await ws.actions.deleteItem(item.key); ws.close(); });
  };
  const removePayment = (key: string, text: string) => {
    if (busy || !confirm(`Remove the payment of ${text}? The bill’s progress will go back down.`)) return;
    return run(() => ws.actions.deletePayment(key));
  };

  const rows: [string, string | ReactNode][] = [
    ["Type", item.type], ["Entity", item.entity], [info.accountLabel, item.account], ["Last 4", item.last4 ? `···${item.last4}` : ""],
    [info.referenceLabel, item.reference], ["Description", item.description], ["Received", item.received ? dayLabel(item.received) : (item.row.Received || "")],
    ["Due", item.due ? dayLabel(item.due) : (item.row["Due Date"] || "")], ["Who handles it", item.owner],
    ["Source / email", item.source && URL_ONLY.test(item.source) ? <a href={item.source} target="_blank" rel="noreferrer noopener">{item.source}</a> : item.source],
    ["Notes", item.notes], ["Logged by", item.row["Logged By"] || ""],
  ];
  const canPay = item.payable && item.state !== "cancelled";

  return (
    <div className="acct-view">
      <div className="acct-top">
        <span><DueChip item={item} today={ws.today} /> {item.onHold && item.state !== "cancelled" && <span className="badge warn">On hold</span>}</span>
        {canPay && <button type="button" className="btn primary" onClick={() => ws.open({ kind: "pay", key: item.key })}>Record a payment</button>}
      </div>
      {item.payable ? <ProgressBar item={item} today={ws.today} /> : <p className="sub" style={{ margin: "0 0 6px" }}>Nothing is owed on this item. It is something to file or follow up.</p>}
      <section className="acct-group">
        <h3>Details</h3>
        <dl className="acct-list">
          {rows.filter(([, v]) => v).map(([label, v]) => <div key={label} className="acct-row"><dt>{label}</dt><dd>{v}</dd></div>)}
        </dl>
      </section>
      {item.payable && (
        <section className="acct-group">
          <h3>Payments <span className="kanban-count">{item.payments.length}</span></h3>
          {item.payments.length ? item.payments.map((p, i) => (
            <div className="mini-row" key={`${i}-${p.key}`}>
              <span>
                <b>{money(p.amount)}</b> <small>{p.paidOn ? dayLabel(p.paidOn) : p.paidOnText}{p.method ? ` · ${p.method}` : ""}{p.reference ? ` · ${p.reference}` : ""}{p.paidBy ? ` · ${p.paidBy}` : ""}</small>
                {p.notes && <><br /><small>{p.notes}</small></>}
              </span>
              <button type="button" className="link-button" style={{ color: "#ae493e" }} disabled={busy} onClick={() => removePayment(p.key, money(p.amount))}>Remove</button>
            </div>
          )) : <p className="sub" style={{ margin: 0 }}>No payments recorded yet. Each time a payment is made, record it and the bar above fills up.</p>}
        </section>
      )}
      <div className="edit-actions acct-actions">
        {canPay && <button type="button" className="btn primary" onClick={() => ws.open({ kind: "pay", key: item.key })}>Record a payment</button>}
        <button type="button" className="btn" onClick={() => ws.open({ kind: "edit", key: item.key })}>Edit</button>
        {!item.payable && item.state === "todo" && <button type="button" className="btn primary" disabled={busy} onClick={() => setStatus("Done", `${item.title} marked done`)}>Mark done</button>}
        {!item.payable && item.state === "done" && <button type="button" className="btn" disabled={busy} onClick={() => setStatus("Open", `${item.title} reopened`)}>Reopen</button>}
        {item.payable && item.state !== "cancelled" && item.state !== "paid" && (
          item.onHold
            ? <button type="button" className="btn" disabled={busy} onClick={() => setStatus("Open", `${item.title} is off hold`)}>Take off hold</button>
            : <button type="button" className="btn" disabled={busy} onClick={() => setStatus("On hold", `${item.title} put on hold`)}>Put on hold</button>
        )}
        {item.state === "cancelled"
          ? <button type="button" className="btn" disabled={busy} onClick={() => setStatus("Open", `${item.title} reopened`)}>Reopen</button>
          : <button type="button" className="btn" disabled={busy} onClick={() => { if (confirm(`Cancel “${item.title}”? It stays in the list as cancelled and stops counting as owed.`)) setStatus("Cancelled", `${item.title} cancelled`); }}>Cancel this item</button>}
        <button type="button" className="btn danger" onClick={remove} disabled={busy}>{busy ? "Working…" : "Delete"}</button>
      </div>
    </div>
  );
}

// ── Intake: what arrived, and what will be stored for it ─────────────────────

const BLANK: ItemValues = { type: "", entity: "", account: "", last4: "", reference: "", description: "", owed: false, amount: "", due: "", owner: "", source: "", notes: "" };

const COLUMN_FOR: [keyof ItemValues, string][] = [
  ["type", "Type"], ["entity", "Entity"], ["account", "Account / Vendor"], ["last4", "Last 4"], ["reference", "Reference"], ["description", "Description"],
  ["due", "Due Date"], ["owner", "Owner"], ["source", "Source / Email"], ["notes", "Notes"],
];

// The same form adds an item and edits one. Editing sends only the fields that changed.
function ItemForm({ item, onClose, onSaved }: { item?: FinItem; onClose: () => void; onSaved: (key: string) => void }) {
  const ws = useFinance();
  const initial = useMemo<ItemValues>(() => item
    ? { type: item.type, entity: item.entity, account: item.account, last4: item.last4, reference: item.reference, description: item.description, owed: item.payable, amount: item.amount !== null ? String(item.amount) : "", due: item.due ? isoDay(item.due) : "", owner: item.owner, source: item.source, notes: item.notes }
    : { ...BLANK, owner: ws.myOwner }, [item, ws.myOwner]);
  const [v, setV] = useState<ItemValues>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const info = v.type ? typeInfo(v.type) : null;
  const set = (k: keyof ItemValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { setError(""); setV(cur => ({ ...cur, [k]: e.target.value })); };
  const quick = useMemo(() => quickDates(ws.today), [ws.today]);
  const warnings = useMemo(() => (v.type ? itemWarnings(v, ws.items, ws.today, item?.key) : []), [v, ws.items, ws.today, item]);
  const preview = useMemo(() => Object.entries(itemRow(v, "", ws.today, ws.me)).filter(([k, val]) => k !== "ID" && val !== ""), [v, ws.today, ws.me]);

  const pickType = (name: string) => {
    setError("");
    setV(cur => (cur.type === name ? cur : { ...cur, type: name, owed: typeInfo(name).owed, last4: typeInfo(name).last4 ? cur.last4 : "" }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const problem = itemError(v);
    if (problem) return setError(problem);
    if (item && !v.owed && item.payments.length) return setError("Payments are recorded on this item, so an amount owed is needed. Remove the payments first if the item was entered by mistake.");
    setSaving(true);
    try {
      if (item) {
        const next = itemRow(v, item.key, ws.today, "");
        const changes: Record<string, string> = {};
        for (const [k, column] of COLUMN_FOR) if (v[k] !== initial[k]) changes[column] = next[column];
        if (v.owed !== initial.owed || v.amount !== initial.amount) changes["Amount Due"] = next["Amount Due"];
        if (!Object.keys(changes).length) return setError("Nothing was changed.");
        await ws.actions.updateItem(item.key, changes, `${v.account.trim()} updated`);
        onSaved(item.key);
      } else {
        const id = ws.actions.newId("F");
        const row = itemRow(v, id, ws.today, ws.me || "Someone");
        await ws.actions.addItem(row);
        const owed = row["Amount Due"] ? `${money(Number(row["Amount Due"]))} owed${v.due.trim() ? `, due ${dayLabel(findDate(v.due)?.date as Date, false)}` : ""}` : "nothing owed";
        ws.actions.logActivity(activityRow({ user: ws.me || "Someone", type: "added", itemId: id, to: v.type, detail: `${v.type}: ${row["Account / Vendor"]}${row.Reference ? ` (${row.Reference})` : ""} added, ${owed}`, now: new Date() }));
        onSaved(id);
      }
    } catch {
      // the page already showed an error toast; keep the form open with what was typed
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-grid acct-form" onSubmit={submit}>
      <fieldset className="acct-fieldset full">
        <legend>1. What arrived?</legend>
        <div className="fin-types" role="group" aria-label="Kind of item">
          {FIN_TYPES.map(t => (
            <button type="button" key={t.name} className={`fin-type${v.type === t.name ? " selected" : ""}`} aria-pressed={v.type === t.name} onClick={() => pickType(t.name)}>
              <b>{t.name}</b>
              <small>{t.blurb}</small>
            </button>
          ))}
        </div>
      </fieldset>

      {info && (
        <>
          <fieldset className="acct-fieldset full">
            <legend>2. Which one is it?</legend>
            <div className="form-grid">
              <label>
                <span>{info.accountLabel} <span aria-hidden="true">*</span></span>
                <input value={v.account} onChange={set("account")} placeholder={info.accountHint} />
              </label>
              <label>
                <span>Which business or entity</span>
                <input value={v.entity} onChange={set("entity")} list="fin-entities" placeholder="e.g. EA Hackensack" />
                <datalist id="fin-entities">{ws.entities.map(o => <option key={o} value={o} />)}</datalist>
              </label>
              {info.last4 && (
                <label>
                  <span>Last 4 digits</span>
                  <input value={v.last4} onChange={set("last4")} inputMode="numeric" maxLength={4} placeholder="1234" />
                  <small className="sub">Only the last four, never the full number.</small>
                </label>
              )}
              <label>
                <span>{info.referenceLabel}</span>
                <input value={v.reference} onChange={set("reference")} placeholder={info.referenceHint} />
              </label>
              <label className="full">
                <span>What is it for? (optional)</span>
                <input value={v.description} onChange={set("description")} placeholder="A few words, if the name above isn’t enough" />
              </label>
            </div>
          </fieldset>

          <fieldset className="acct-fieldset full">
            <legend>3. Is money owed?</legend>
            <div className="form-grid">
              <label className="full fin-check">
                <input type="checkbox" checked={v.owed} onChange={e => { setError(""); setV(cur => ({ ...cur, owed: e.target.checked })); }} />
                <span>Money is owed on this</span>
              </label>
              <p className="sub full" style={{ margin: 0 }}>
                {v.owed
                  ? "It will be flagged as a bill, listed under Payments to make on the Tasks tab, and get a progress bar that fills as payments are recorded."
                  : "Nothing to pay. It will be listed as something to file or follow up, and you can mark it done."}
              </p>
              {v.owed && (
                <label>
                  <span>Amount owed ($) <span aria-hidden="true">*</span></span>
                  <input value={v.amount} onChange={set("amount")} inputMode="decimal" placeholder="e.g. 1,250.00" />
                  <small className="sub">The full amount on the bill. Payments are recorded against it.</small>
                </label>
              )}
              <div className={`acct-follow${v.owed ? "" : " full"}`}>
                <label className="full">
                  <span>{v.owed ? "Due date" : "Follow-up date (optional)"}</span>
                  <input type="date" value={v.due} onChange={set("due")} />
                </label>
                <div className="full chips">
                  {quick.map(q => <button type="button" key={q.iso} className={`chip sm${v.due === q.iso ? " selected" : ""}`} onClick={() => { setError(""); setV(cur => ({ ...cur, due: q.iso })); }}>{q.label}</button>)}
                </div>
              </div>
            </div>
          </fieldset>

          <fieldset className="acct-fieldset full">
            <legend>4. Who and where from</legend>
            <div className="form-grid">
              <label>
                <span>Who handles it?</span>
                <input value={v.owner} onChange={set("owner")} list="fin-owners" placeholder="Name" />
                <datalist id="fin-owners">{ws.owners.map(o => <option key={o} value={o} />)}</datalist>
              </label>
              <label>
                <span>Where did it come from?</span>
                <input value={v.source} onChange={set("source")} placeholder="e.g. email subject, or a link" />
              </label>
              <label className="full">
                <span>Notes (optional)</span>
                <textarea rows={2} value={v.notes} onChange={set("notes")} />
              </label>
            </div>
          </fieldset>

          <section className="fin-preview full" aria-label="What will be saved">
            <h3>What will be saved</h3>
            <p className="sub" style={{ margin: "0 0 6px" }}>These become one row in the {ITEMS_SHEET} sheet ({APP_SHEETS[ITEMS_SHEET].length} columns). Empty ones stay blank.</p>
            <dl className="acct-list">
              {preview.map(([k, val]) => <div key={k} className="acct-row"><dt>{k}</dt><dd>{val}</dd></div>)}
            </dl>
          </section>
        </>
      )}

      {warnings.map((w, i) => <p className="form-warn full" key={i} role="status">{w}</p>)}
      {error && <p className="form-error full" role="alert">{error}</p>}
      <div className="edit-actions">
        <button className="btn" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        <button className={`btn primary${saving ? " is-pending" : ""}`} type="submit" disabled={saving || !v.type} aria-busy={saving}>
          {saving && <span className="spinner" aria-hidden="true" />}
          {saving ? "Saving…" : item ? "Save changes" : warnings.length ? "Save anyway" : "Add item"}
        </button>
      </div>
    </form>
  );
}

// ── Recording a payment ──────────────────────────────────────────────────────

function PaymentForm({ item, onClose }: { item: FinItem; onClose: () => void }) {
  const ws = useFinance();
  const [v, setV] = useState<PaymentValues>({ amount: "", paidOn: isoDay(ws.today), method: PAYMENT_METHODS[0], reference: "", notes: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: keyof PaymentValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { setError(""); setV(cur => ({ ...cur, [k]: e.target.value })); };
  const warnings = useMemo(() => paymentWarnings(v, item, ws.today), [v, item, ws.today]);
  const left = item.remaining ?? 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const problem = paymentError(v);
    if (problem) return setError(problem);
    setSaving(true);
    try {
      const id = ws.actions.newId("P");
      const row = paymentRow(v, id, item.key, ws.me || "Someone");
      await ws.actions.addPayment(row);
      const paid = Number(row.Amount);
      const after = Math.max(0, Math.round((left - paid) * 100) / 100);
      ws.actions.logActivity(activityRow({
        user: ws.me || "Someone", type: "paid", itemId: item.key, to: money(paid),
        detail: `${item.title}${item.reference ? ` (${item.reference})` : ""}: ${money(paid)} paid, ${after > 0 ? `${money(after)} still to pay` : "paid in full"}`, now: new Date(),
      }));
      onClose();
    } catch {
      // the page already showed an error toast; keep the form open with what was typed
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      <div className="full">
        <p className="sub ctx-line" style={{ margin: 0 }}>For: <b>{item.title}</b>{item.reference ? ` · ${item.reference}` : ""} · <DueChip item={item} today={ws.today} /></p>
        <ProgressBar item={item} today={ws.today} />
      </div>
      <label>
        <span>Amount paid ($) *</span>
        <input value={v.amount} onChange={set("amount")} inputMode="decimal" placeholder="e.g. 500" />
        {left > 0 && <button type="button" className="link-button" style={{ justifySelf: "start" }} onClick={() => { setError(""); setV(cur => ({ ...cur, amount: String(left) })); }}>Pay the rest ({money(left)})</button>}
      </label>
      <label>
        <span>Date paid *</span>
        <input type="date" value={v.paidOn} onChange={set("paidOn")} />
      </label>
      <label>
        <span>How was it paid?</span>
        <select value={v.method} onChange={set("method")}>{PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}</select>
      </label>
      <label>
        <span>Check number or confirmation</span>
        <input value={v.reference} onChange={set("reference")} placeholder="Optional" />
      </label>
      <label className="full">
        <span>Notes (optional)</span>
        <input value={v.notes} onChange={set("notes")} />
      </label>
      {warnings.map((w, i) => <p className="form-warn full" key={i} role="status">{w}</p>)}
      {error && <p className="form-error full" role="alert">{error}</p>}
      <div className="edit-actions">
        <button className="btn" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        <button className={`btn primary${saving ? " is-pending" : ""}`} type="submit" disabled={saving} aria-busy={saving}>
          {saving && <span className="spinner" aria-hidden="true" />}
          {saving ? "Saving…" : warnings.length ? "Save anyway" : "Save payment"}
        </button>
      </div>
    </form>
  );
}

// ── The Bills & Payments tab ─────────────────────────────────────────────────

const GROUPS = [
  { id: "overdue", title: "Overdue", hint: "Past the due date. Pay these first." },
  { id: "today", title: "Due today", hint: "" },
  { id: "week", title: "Due in the next 7 days", hint: "" },
  { id: "later", title: "Due later", hint: "" },
  { id: "nodate", title: "No due date", hint: "Add a due date so these show up as due." },
  { id: "finished", title: "Paid, done or cancelled", hint: "" },
] as const;
type GroupId = (typeof GROUPS)[number]["id"];
const GROUP_PAGE = 12;

function ItemRow({ item }: { item: FinItem }) {
  const ws = useFinance();
  return (
    <div className="fu-row fin-row">
      <div className="fu-main">
        <ItemName item={item} />
        <div className="fu-meta">
          {item.reference && <span>{item.reference}</span>}
          <DueChip item={item} today={ws.today} />
          {item.owner && <span>{item.owner}</span>}
          {item.entity && <span>{item.entity}</span>}
          {item.onHold && item.state !== "cancelled" && <span className="badge warn">On hold</span>}
        </div>
        <ProgressBar item={item} today={ws.today} />
      </div>
      <div className="fu-actions">
        {needsPaying(item) && <button type="button" className="btn primary" onClick={() => ws.open({ kind: "pay", key: item.key })}>Record a payment</button>}
        {item.state === "todo" && <button type="button" className="btn primary" onClick={() => { ws.actions.updateItem(item.key, { Status: "Done" }, `${item.title} marked done`).catch(() => {}); }}>Mark done</button>}
        <button type="button" className="btn" onClick={() => ws.open({ kind: "view", key: item.key })}>Open</button>
      </div>
    </div>
  );
}

function ItemsTable({ items }: { items: FinItem[] }) {
  const ws = useFinance();
  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <table className="wk-table acct-table">
          <thead>
            <tr>{["Item", "Type", "Entity", "Reference", "Owner", "Due", "Owed", "Paid", "Left", "Status"].map(h => <th key={h} scope="col" style={{ padding: "6px 10px" }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((i, n) => (
              <tr key={`${n}-${i.key}`}>
                <th scope="row"><button type="button" className="acct-name" onClick={() => ws.open({ kind: "view", key: i.key })}>{i.title}</button></th>
                <td>{i.type || "—"}</td><td>{i.entity || "—"}</td><td>{i.reference || "—"}</td><td>{i.owner || "—"}</td>
                <td>{i.due ? dayLabel(i.due) : "—"}</td>
                <td>{i.amount !== null ? money(i.amount) : "—"}</td><td>{i.payable ? money(i.paid) : "—"}</td><td>{i.remaining !== null ? money(i.remaining) : "—"}</td>
                <td><DueChip item={i} today={ws.today} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sub" style={{ margin: "8px 0 0" }}>Owed, paid and left are worked out from the payments recorded on each item.</p>
    </>
  );
}

export function PayablesTab() {
  const ws = useFinance();
  const [filter, setFilter] = useState<FinFilter>(() => (ws.items.some(needsPaying) ? "needs" : "all"));
  const [view, setView] = useState<"list" | "table">("list");
  const [query, setQuery] = useState("");
  const [all, setAll] = useState<Record<string, boolean>>({});
  const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [f.id, ws.items.filter(i => matchesFilter(i, f.id, ws.today)).length])) as Record<FinFilter, number>, [ws.items, ws.today]);
  const visible = useMemo(
    () => inUrgencyOrder(ws.items.filter(i => matchesFilter(i, filter, ws.today) && matchesSearch(i, query)), ws.today),
    [ws.items, filter, ws.today, query],
  );
  const groups = useMemo(() => {
    const out: Record<GroupId, FinItem[]> = { overdue: [], today: [], week: [], later: [], nodate: [], finished: [] };
    for (const i of visible) out[isOpen(i) ? dueState(i, ws.today).state : "finished"].push(i);
    return out;
  }, [visible, ws.today]);

  if (!ws.items.length) {
    return (
      <section className="card">
        <p className="sub" style={{ marginTop: 0 }}>Nothing has been entered yet. Add each bill, statement or notice as it arrives (a credit-card bill, a vendor invoice, a bank notice). When money is owed it gets a progress bar, so a bill paid in parts shows how much is left until it is fully paid.</p>
        <button type="button" className="btn primary" onClick={() => ws.open({ kind: "add" })}>＋ Add the first item</button>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="pipe-toolbar">
        <div className="chips" aria-label="Which items to show">
          {FILTERS.map(f => (
            <button key={f.id} type="button" className={`chip ${filter === f.id ? "selected" : ""}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label} <span className="chip-count">{counts[f.id]}</span></button>
          ))}
        </div>
        <input className="grow" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search vendors, cards, references…" aria-label="Search bills and payments" />
        <div className="chips" aria-label="How to look at the list">
          {([["list", "List"], ["table", "Table"]] as const).map(([id, label]) => (
            <button key={id} type="button" className={`chip sm ${view === id ? "selected" : ""}`} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>
          ))}
        </div>
        <button type="button" className="btn primary" onClick={() => ws.open({ kind: "add" })}>＋ Add item</button>
      </div>
      <p className="sub stage-strip">
        {plural(visible.length, "item")} shown{ws.totals.owed > 0 ? <> · <b>{money(ws.totals.owed)}</b> still to pay across {plural(ws.totals.billsOpen, "open bill")}</> : ""}
      </p>
      {!visible.length && <p className="sub">Nothing matches. Try another filter{query ? " or clear the search" : ""}.</p>}
      {view === "table" && visible.length > 0 && <ItemsTable items={visible} />}
      {view === "list" && GROUPS.map(g => {
        const list = groups[g.id];
        if (!list.length) return null;
        const shown = all[g.id] ? list : list.slice(0, GROUP_PAGE);
        return (
          <section className="fu-group" key={g.id}>
            <h3>{g.title} <span className="kanban-count">{list.length}</span></h3>
            {g.hint && <p className="sub" style={{ margin: "0 0 4px" }}>{g.hint}</p>}
            {shown.map((i, n) => <ItemRow key={`${n}-${i.key}`} item={i} />)}
            {list.length > GROUP_PAGE && !all[g.id] && (
              <button type="button" className="btn" style={{ marginTop: 6 }} onClick={() => setAll(cur => ({ ...cur, [g.id]: true }))}>Show all {list.length}</button>
            )}
          </section>
        );
      })}
    </section>
  );
}

// ── Summary, Tasks and KPIs ──────────────────────────────────────────────────

function TotalTiles() {
  const { totals: t } = useFinance();
  const tiles = [
    { label: "Still to pay", value: money(t.owed), detail: `Across ${plural(t.billsOpen, "open bill")}`, tone: "lav" },
    { label: "Overdue", value: String(t.overdueCount), detail: t.overdueCount ? `${money(t.overdueAmount)} past due` : "Nothing overdue", tone: t.overdueCount ? "peach" : "sage" },
    { label: "Due in 7 days", value: String(t.dueWeekCount), detail: t.dueWeekCount ? `${money(t.dueWeekAmount)} coming up` : "Nothing due this week", tone: "yellow" },
    { label: "Part paid", value: String(t.partialCount), detail: t.partialCount ? `${money(t.partialPaid)} paid so far` : "None in progress", tone: "blue" },
    { label: "To file / follow up", value: String(t.todoCount), detail: t.todoOverdue ? `${t.todoOverdue} late` : "Nothing owed on these", tone: "mint" },
  ];
  return (
    <section className="kpis kpis-5 pipe-kpis" aria-label="Bills and payments">
      {tiles.map(t => <div className={`card kpi ${t.tone}`} key={t.label}><span className="label">{t.label}</span><strong>{t.value}</strong><small>{t.detail}</small></div>)}
    </section>
  );
}

export function FinanceHealth({ onOpenPayables }: { onOpenPayables: () => void }) {
  const ws = useFinance();
  const next = useMemo(() => inUrgencyOrder(ws.items.filter(needsPaying), ws.today).slice(0, 5), [ws.items, ws.today]);
  return (
    <section className="card store-health" style={{ marginBottom: 16 }} aria-label="Bills and payments">
      <div className="list-toolbar">
        <h2 className="section-title" style={{ margin: 0 }}>Bills &amp; payments</h2>
        <div className="chips">
          <button type="button" className="btn primary" onClick={() => ws.open({ kind: "add" })}>＋ Add item</button>
          <button type="button" className="btn" onClick={onOpenPayables}>Open Bills &amp; Payments →</button>
        </div>
      </div>
      <TotalTiles />
      <h3 className="viz-title" style={{ margin: "12px 0 4px" }}>Next to pay</h3>
      {next.length ? next.map((i, n) => (
        <div className="fin-next" key={`${n}-${i.key}`}>
          <div className="mini-row" style={{ borderBottom: 0, paddingBottom: 0 }}>
            <span><ItemName item={i} /><br /><small>{[i.reference, i.owner, i.onHold ? "On hold" : ""].filter(Boolean).join(" · ")}</small></span>
            <span className="fin-next-right"><DueChip item={i} today={ws.today} /><button type="button" className="link-button" onClick={() => ws.open({ kind: "pay", key: i.key })}>Record a payment</button></span>
          </div>
          <ProgressBar item={i} today={ws.today} />
        </div>
      )) : <p className="sub" style={{ margin: 0 }}>{ws.items.length ? "Nothing is waiting to be paid." : "No bills entered yet. Use “＋ Add item” when a bill, statement or notice arrives."}</p>}
      <details className="explain-details">
        <summary>How this works</summary>
        <dl className="explain-list">
          <dt>Add item</dt><dd>Each bill, statement or notice is entered once, by kind (credit card, vendor bill, bank account…).</dd>
          <dt>Money owed</dt><dd>An item with an amount owed is a bill: it appears under Payments to make on the Tasks tab, with a progress bar.</dd>
          <dt>Record a payment</dt><dd>Each payment is added to the bill, so one paid in parts shows how much is left until it is fully paid.</dd>
        </dl>
      </details>
    </section>
  );
}

/** The Tasks tab's list of what has to be paid or followed up, with each bill's progress. */
export function PaymentsDue({ onOpenPayables }: { onOpenPayables: () => void }) {
  const ws = useFinance();
  const [all, setAll] = useState(false);
  const list = useMemo(() => inUrgencyOrder(ws.items.filter(i => needsPaying(i) || i.state === "todo"), ws.today), [ws.items, ws.today]);
  const shown = all ? list : list.slice(0, 8);
  return (
    <section className="card" style={{ marginBottom: 16 }} aria-label="Payments to make">
      <div className="list-toolbar">
        <h2 className="section-title" style={{ margin: 0 }}>Payments to make <span className="kanban-count">{list.length}</span></h2>
        <div className="chips">
          <button type="button" className="btn" onClick={() => ws.open({ kind: "add" })}>＋ Add item</button>
          <button type="button" className="btn" onClick={onOpenPayables}>Open Bills &amp; Payments →</button>
        </div>
      </div>
      {list.length ? (
        <>
          <p className="sub" style={{ margin: "0 0 4px" }}>Bills with money owed, most urgent first. The bar fills as payments are recorded.</p>
          {shown.map((i, n) => <ItemRow key={`${n}-${i.key}`} item={i} />)}
          {list.length > 8 && !all && <button type="button" className="btn" style={{ marginTop: 6 }} onClick={() => setAll(true)}>Show all {list.length}</button>}
        </>
      ) : <p className="sub" style={{ margin: 0 }}>{ws.items.length ? "Nothing to pay or follow up right now." : "No bills entered yet. Add one and it shows up here with a progress bar."}</p>}
    </section>
  );
}

export function FinanceKpis() {
  return (
    <section className="card" style={{ marginBottom: 16 }} aria-label="Bills and payments numbers">
      <h2 className="section-title">Bills &amp; payments</h2>
      <TotalTiles />
    </section>
  );
}

// ── Weekly Closing: what was paid -> what is still open -> wrap-up ───────────

type WrapFields = { wins: string; misses: string; blockers: string; next: string };
const NO_FIELDS: WrapFields = { wins: "", misses: "", blockers: "", next: "" };

export function CloseFinanceWeek({ wraps, onSave }: {
  /** Wrap-ups already saved for Finance & Office (to say when the week being closed already has one). */
  wraps: SheetRow[];
  /** Save a note under this ISO week key (the page shows the toast; throws on failure). */
  onSave: (note: string, weekKey: string) => Promise<void>;
}) {
  const ws = useFinance();
  const [offset, setOffset] = useState<0 | -1>(0);
  const [fields, setFields] = useState<WrapFields>(NO_FIELDS);
  const [saving, setSaving] = useState(false);
  const span = useMemo(() => weekSpan(new Date(ws.now), offset), [ws.now, offset]);
  const week = useMemo(() => weekPayments(ws.items, span), [ws.items, span]);
  const late = useMemo(() => inUrgencyOrder(ws.items.filter(isOpen), ws.today).filter(i => dueState(i, ws.today).state === "overdue"), [ws.items, ws.today]);
  const already = wraps.filter(w => w["Source ID"] === span.key);
  const empty = !Object.values(fields).some(x => x.trim());
  const set = (name: keyof WrapFields) => (e: React.ChangeEvent<HTMLTextAreaElement>) => setFields(f => ({ ...f, [name]: e.target.value }));

  const save = async () => {
    if (saving || empty) return;
    const parts = ([["Wins", fields.wins], ["Misses", fields.misses], ["Blockers", fields.blockers], ["Next week", fields.next]] as const)
      .filter(([, x]) => x.trim())
      .map(([k, x]) => `${k}: ${x.trim()}`);
    setSaving(true);
    try {
      await onSave([numbersLine(ws.items, week, ws.today, span), ...parts].join("\n"), span.key);
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
        <div className="chips">
          <button type="button" className={`chip sm ${offset === 0 ? "selected" : ""}`} aria-pressed={offset === 0} onClick={() => setOffset(0)}>This week</button>
          <button type="button" className={`chip sm ${offset === -1 ? "selected" : ""}`} aria-pressed={offset === -1} onClick={() => setOffset(-1)}>Last week</button>
        </div>
      </div>

      <div className="close-step">
        <h3><span className="step-num">1</span> The numbers · {span.label}</h3>
        <TotalTiles />
        <p className="sub" style={{ margin: "6px 0 0" }}>
          <b>{money(week.total)}</b> paid in {plural(week.list.length, "payment")} this week · {plural(week.paidInFull.length, "bill")} paid off.
        </p>
      </div>

      <div className="close-step">
        <h3><span className="step-num">2</span> What was paid</h3>
        {week.list.length ? week.list.map(({ p, item }, i) => (
          <div className="mini-row" key={`${i}-${p.key}`}>
            <b>{item?.title ?? "Item"} · {money(p.amount)}</b>
            <small>{p.paidOn ? dayLabel(p.paidOn, false) : p.paidOnText}{p.method ? ` · ${p.method}` : ""}{p.paidBy ? ` · ${p.paidBy}` : ""}</small>
          </div>
        )) : <p className="sub" style={{ margin: 0 }}>No payments were recorded in this week. Record each payment on its bill and it is listed here.</p>}
      </div>

      <div className="close-step">
        <h3><span className="step-num">3</span> What is still open</h3>
        <p className="sub" style={{ margin: "0 0 6px" }}>
          <b>{money(ws.totals.owed)}</b> still to pay · <b>{ws.totals.overdueCount}</b> overdue · <b>{ws.totals.dueWeekCount}</b> due in the next week · <b>{ws.totals.todoCount}</b> to file or follow up
        </p>
        {late.slice(0, 6).map((i, n) => (
          <div className="mini-row" key={`${n}-${i.key}`}>
            <button type="button" className="acct-name" onClick={() => ws.open({ kind: "view", key: i.key })}>{i.title}</button>
            <small>{i.remaining !== null ? `${money(i.remaining)} · ` : ""}{dueText(i, ws.today).text}</small>
          </div>
        ))}
      </div>

      <div className="close-step">
        <h3><span className="step-num">4</span> Wrap-up · {span.key}</h3>
        <p className="sub" style={{ margin: "0 0 8px" }}>
          <button type="button" className="btn" onClick={() => setFields(weekWrapUp(ws.items, week, ws.today))}>Fill in from the payments</button>{" "}
          It writes a first draft you can change. The week’s finance numbers are saved with the wrap-up.
        </p>
        {already.length > 0 && <p className="sub" style={{ margin: "0 0 8px" }}>A wrap-up for {span.key} was already saved{already[0].Timestamp ? ` on ${new Date(already[0].Timestamp).toLocaleDateString()}` : ""}. Saving adds another.</p>}
        <div className="form-grid">
          <label className="full"><span>Wins — what went well</span><textarea rows={4} value={fields.wins} onChange={set("wins")} placeholder="Bills paid off, payments made on time…" /></label>
          <label className="full"><span>Misses — what slipped</span><textarea rows={4} value={fields.misses} onChange={set("misses")} placeholder="Bills that were late, and why" /></label>
          <label className="full"><span>Blockers — what’s in the way</span><textarea rows={4} value={fields.blockers} onChange={set("blockers")} placeholder="Disputed or on-hold bills, anything that needs a decision" /></label>
          <label className="full"><span>Next week’s priorities</span><textarea rows={4} value={fields.next} onChange={set("next")} placeholder="The payments that must go out next week" /></label>
          <button type="button" className={`btn primary${saving ? " is-pending" : ""}`} disabled={empty || saving} aria-busy={saving} onClick={save}>
            {saving && <span className="spinner" aria-hidden="true" />}
            {saving ? "Saving…" : `Save ${span.key} wrap-up`}
          </button>
        </div>
      </div>
    </section>
  );
}
