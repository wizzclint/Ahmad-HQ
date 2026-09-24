"use client";

import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { SheetRow } from "@/lib/hq-types";
import {
  FOLLOW_GROUPS, NUMBER_HELP, SALES_STAGE_DEFS, STAGE, STAGE_HINTS,
  accountsFrom, activityRow, addNoteLine, composeFollowUp, customerRowFor, dayLabel, daysSinceContact, duplicateOf, fieldGroups, fieldHint,
  followGroups, followState, hasCustomer, isBlank, isMine, isoDay, latestMonthTest, matchesSearch, nameKey, needsTouch, numbersLine, parseFollowUp,
  pipelineColumns, pipelineEvents, pipelineNumbers, quickDates, reachedNames, stageChoices, stageIndex, suggestStage, taskIsClosed, tasksForAccount,
  todayUTC, touchKinds, touchLine, weekSpan, weekSummary, weekWrapUp,
  type Account, type PipelineEvent, type PipelineNumbers, type Roles,
} from "@/lib/hq-pipeline";
import { SalesFunnelChart } from "./charts";
import { Modal } from "./modal";

// Gardenia's Fire sales pipeline, in one place so the tabs work as one system:
//  - <PipelineWorkspace> owns the accounts, the dialogs (account card, add / edit, log a touch, add a task, won -> customer,
//    this month's test) and the history, so the Summary, Sales Pipeline, KPIs and Weekly Closing tabs can all open them;
//  - the Sales Pipeline tab (follow-ups, board, every column), the Summary panel, the KPI numbers and the guided closing.
// The page supplies the saving (see PipelineActions), so this file never talks to the API.

export type NewAccountTask = { account: string; description: string; owner: string; due: string; priority: string };

export type PipelineActions = {
  addAccount: (row: Record<string, string>) => Promise<void>;
  updateAccount: (key: string, changes: Record<string, string>, message?: string) => Promise<void>;
  deleteAccount: (key: string) => Promise<void>;
  /** Best-effort history entry: a failure must not undo the change that was already saved. */
  logActivity: (row: Record<string, string>) => void;
  createTask: (task: NewAccountTask) => Promise<void>;
  createCustomer: (row: Record<string, string>) => Promise<void>;
  saveMonthTest: (text: string) => Promise<void>;
};

type Dialog = { kind: "view" | "edit" | "touch" | "task" | "won"; key: string } | { kind: "add" | "test" };

type Workspace = {
  accounts: Account[];
  headers: string[];
  roles: Roles;
  now: number;
  today: Date;
  events: PipelineEvent[];
  numbers: PipelineNumbers;
  openTasks: SheetRow[];
  owners: string[];
  me: string;
  /** The owner name (as written in the sheet) that is the signed-in person, or "". */
  myOwner: string;
  monthTest: SheetRow | null;
  actions: PipelineActions;
  open: (d: Dialog) => void;
  close: () => void;
  moveStage: (a: Account, label: string) => Promise<void>;
  afterStageChange: (a: Account, label: string) => void;
  logAdded: (name: string, row: Record<string, string>) => void;
  tasksFor: (a: Account) => SheetRow[];
  eventsFor: (a: Account) => PipelineEvent[];
};

const WorkspaceContext = createContext<Workspace | null>(null);
function usePipeline(): Workspace {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("Pipeline components must be rendered inside <PipelineWorkspace>.");
  return ctx;
}

const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? "";
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const shortDay = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

function lastTouchText(a: Account, today: Date): string {
  const d = daysSinceContact(a, today);
  if (d === null) return a.lastContactText ? `Last contact: ${a.lastContactText}` : "Never contacted";
  if (d < 0) return `Last contact ${dayLabel(a.lastContact as Date)}`;
  return d === 0 ? "Contacted today" : d === 1 ? "Contacted yesterday" : `Last contact ${d} days ago`;
}

function StageChip({ a }: { a: Account }) {
  return <span className={`stage-chip s${a.stageIdx}`} title={STAGE_HINTS[SALES_STAGE_DEFS[a.stageIdx].id]}>{a.stage || SALES_STAGE_DEFS[0].label}</span>;
}

function FollowChip({ a, today }: { a: Account; today: Date }) {
  const { state, days } = followState(a, today);
  const text = state === "overdue" ? `Overdue ${plural(-(days ?? 0), "day")}`
    : state === "today" ? "Due today"
    : state === "week" ? `Due ${shortDay(a.followUp.date as Date)}`
    : state === "later" ? `Due ${dayLabel(a.followUp.date as Date)}`
    : "No follow-up date";
  return <span className={`due-chip ${state}`}>{text}</span>;
}

// ── The shared workspace ─────────────────────────────────────────────────────

export function PipelineWorkspace({ rows, activity, tasks, customers, notes, owners, me, actions, children }: {
  /** HQ_GARDENIA_PIPELINE. */
  rows: SheetRow[];
  /** HQ_ACTIVITY: stage moves and touches are read from (and written to) it. */
  activity: SheetRow[];
  /** HQ_GARDENIA_TASKS. */
  tasks: SheetRow[];
  customers: SheetRow[];
  /** HQ_NOTES (for "this month's test"). */
  notes: SheetRow[];
  owners: string[];
  /** The signed-in person's name. */
  me: string;
  actions: PipelineActions;
  children: ReactNode;
}) {
  const { headers, roles } = useMemo(() => pipelineColumns(rows), [rows]);
  const accounts = useMemo(() => accountsFrom(rows, headers, roles), [rows, headers, roles]);
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
  const events = useMemo(() => pipelineEvents(activity), [activity]);
  const reached = useMemo(() => reachedNames(activity), [activity]);
  const numbers = useMemo(() => pipelineNumbers(accounts, reached), [accounts, reached]);
  const openTasks = useMemo(() => tasks.filter(t => !taskIsClosed(t)), [tasks]);
  const monthTest = useMemo(() => latestMonthTest(notes), [notes]);
  const myOwner = useMemo(() => {
    const first = firstName(me).toLowerCase();
    return first.length >= 2 ? owners.find(o => o.toLowerCase().includes(first)) ?? "" : "";
  }, [me, owners]);
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const stageLabelOf = (a: Account) => a.stage || SALES_STAGE_DEFS[0].label;
  const logMove = (a: Account, to: string) =>
    actions.logActivity(activityRow({ user: me || "Someone", type: "move", name: a.name, from: stageLabelOf(a), to, detail: `${a.name}: ${stageLabelOf(a)} → ${to}`, now: new Date() }));
  const offerCustomer = (a: Account, to: string) => {
    if (stageIndex(to) === STAGE.firstOrderWon && a.stageIdx < STAGE.firstOrderWon && !hasCustomer(customers, a.name)) setDialog({ kind: "won", key: a.key });
  };
  const afterStageChange = (a: Account, to: string) => { logMove(a, to); offerCustomer(a, to); };
  const moveStage = async (a: Account, label: string) => {
    if (!roles.stage || label === a.stage) return;
    await actions.updateAccount(a.key, { [roles.stage]: label }, `${a.name} moved to ${label}`);
    afterStageChange(a, label);
  };

  const value: Workspace = {
    accounts, headers, roles, now, today, events, numbers, openTasks, owners, me, myOwner, monthTest, actions,
    open: setDialog,
    close: () => setDialog(null),
    moveStage,
    afterStageChange,
    logAdded: (name, row) => actions.logActivity(activityRow({ user: me || "Someone", type: "add", name, to: roles.stage ? row[roles.stage] ?? "" : "", detail: `${name} added to the pipeline${roles.owner && row[roles.owner] ? ` (${row[roles.owner]})` : ""}`, now: new Date() })),
    tasksFor: a => tasksForAccount(a.name, tasks),
    eventsFor: a => events.filter(e => nameKey(e.name) === nameKey(a.name)),
  };

  const account = dialog && "key" in dialog ? accounts.find(a => a.key === dialog.key) ?? null : null;
  const done = () => setDialog(null);
  let modal: ReactNode = null;
  if (dialog?.kind === "add") {
    modal = <Modal key="add" title="Add an account" onClose={done}><AccountForm onClose={done} onSaved={key => setDialog({ kind: "view", key })} /></Modal>;
  } else if (dialog?.kind === "test") {
    modal = <Modal key="test" title="This month’s test" onClose={done}><MonthTestForm onClose={done} /></Modal>;
  } else if (dialog && account) {
    const k = dialog.kind;
    modal = (
      <Modal key={`${k}-${account.key}`} title={k === "view" ? account.name : k === "edit" ? `Edit ${account.name}` : k === "touch" ? `Log a touch · ${account.name}` : k === "task" ? `Add a task · ${account.name}` : `${account.name} · first order won`} onClose={done}>
        {k === "view" && <AccountView a={account} />}
        {k === "edit" && <AccountForm account={account} onClose={() => setDialog({ kind: "view", key: account.key })} onSaved={key => setDialog({ kind: "view", key })} />}
        {k === "touch" && <TouchForm a={account} onClose={done} />}
        {k === "task" && <TaskForm a={account} onClose={done} />}
        {k === "won" && <WonForm a={account} onClose={done} />}
      </Modal>
    );
  }

  return <WorkspaceContext.Provider value={value}>{children}{modal}</WorkspaceContext.Provider>;
}

// ── One account, every column ────────────────────────────────────────────────

const URL_ONLY = /^https?:\/\/\S+$/i;

function AccountView({ a }: { a: Account }) {
  const ws = usePipeline();
  const { headers, roles, today } = ws;
  const groups = useMemo(() => fieldGroups(headers, roles), [headers, roles]);
  const tasks = ws.tasksFor(a);
  const events = ws.eventsFor(a).slice(0, 5);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (busy || !confirm(`Delete “${a.name}” from the pipeline? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await ws.actions.deleteAccount(a.key);
      ws.close();
    } catch {
      // the page already showed an error toast
      setBusy(false);
    }
  };

  const valueOf = (h: string): ReactNode => {
    const raw = (a.row[h] ?? "").trim();
    if (h === roles.stage) return <StageChip a={a} />;
    if (h === roles.nextFollowUp) {
      if (!raw) return <span className="muted">Not set. This account will not show as due.</span>;
      return <span>{a.followUp.date ? `${dayLabel(a.followUp.date)}${a.followUp.action ? ` · ${a.followUp.action}` : ""}` : raw} <FollowChip a={a} today={today} /></span>;
    }
    if (h === roles.lastContact) return raw ? <span>{raw} <span className="muted">· {lastTouchText(a, today)}</span></span> : <span className="muted">Never contacted</span>;
    if (!raw) return <span className="muted">Not set</span>;
    if (h === roles.notes) return <div className="acct-notes">{raw.split("\n").map((l, i) => <p key={i}>{l}</p>)}</div>;
    if (URL_ONLY.test(raw)) return <a href={raw} target="_blank" rel="noreferrer noopener">{raw}</a>;
    return raw;
  };

  return (
    <div className="acct-view">
      <div className="acct-top">
        <StageChip a={a} />
        {roles.stage && (
          <label className="acct-move-label">
            <span className="sub">Move to</span>
            <select
              value={a.stage || SALES_STAGE_DEFS[0].label}
              onChange={e => { ws.moveStage(a, e.target.value).catch(() => {}); }}
              aria-label={`Move ${a.name} to another stage`}
            >
              {stageChoices(a.stage).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
        )}
      </div>
      {groups.map(g => (
        <section className="acct-group" key={g.title}>
          <h3>{g.title}</h3>
          <dl className="acct-list">
            {g.headers.map(h => (
              <div key={h} className="acct-row">
                <dt>{h}<small>{fieldHint(h, headers, roles)}</small></dt>
                <dd>{valueOf(h)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <section className="acct-group">
        <h3>Tasks for this account <span className="kanban-count">{tasks.filter(t => !taskIsClosed(t)).length} open</span></h3>
        {tasks.length ? tasks.map((t, i) => (
          <div className="mini-row" key={t.ID || i}>
            <b>{t.Description || t.Task}</b>
            <small>{[t.Owner || "no owner", t.Due && `due ${t.Due}`, t.Status || "To do"].filter(Boolean).join(" · ")}</small>
          </div>
        )) : <p className="sub" style={{ margin: 0 }}>No tasks yet for this account.</p>}
      </section>
      <section className="acct-group">
        <h3>Recent activity</h3>
        {events.length ? events.map((e, i) => (
          <div className="mini-row" key={i}><b>{e.type === "move" ? `Moved to ${e.to}` : e.type === "touch" ? `Touch: ${e.to}` : "Added to the pipeline"}</b><small>{e.at.toLocaleDateString()}{e.user ? ` · ${e.user}` : ""}</small></div>
        )) : <p className="sub" style={{ margin: 0 }}>Nothing logged yet. Stage moves and touches show up here.</p>}
      </section>
      <div className="edit-actions acct-actions">
        <button type="button" className="btn primary" onClick={() => ws.open({ kind: "touch", key: a.key })}>Log a touch</button>
        <button type="button" className="btn" onClick={() => ws.open({ kind: "task", key: a.key })}>＋ Task</button>
        <button type="button" className="btn" onClick={() => ws.open({ kind: "edit", key: a.key })}>Edit</button>
        <button type="button" className="btn danger" onClick={remove} disabled={busy}>{busy ? "Deleting…" : "Delete"}</button>
      </div>
    </div>
  );
}

// The same form adds an account and edits one. Editing sends only the fields that changed, and every column the
// sheet has is here, grouped by what it is for, so nothing has to be filled in by hand in the sheet.
function AccountForm({ account, onClose, onSaved }: { account?: Account; onClose: () => void; onSaved: (key: string) => void }) {
  const ws = usePipeline();
  const { headers, roles } = ws;
  const nameHeader = headers[0];
  const groups = useMemo(() => fieldGroups(headers, roles), [headers, roles]);
  const initial = useMemo(() => {
    const v: Record<string, string> = {};
    for (const h of headers) v[h] = (account?.row[h] ?? "").trim();
    if (!account) {
      if (roles.stage) v[roles.stage] = SALES_STAGE_DEFS[0].label;
      if (roles.owner) v[roles.owner] = ws.myOwner;
    }
    return v;
  }, [account, headers, roles, ws.myOwner]);
  const followHeader = roles.nextFollowUp;
  const initialFollow = useMemo(() => parseFollowUp(followHeader ? initial[followHeader] : ""), [initial, followHeader]);
  const initialFollowDate = initialFollow.date ? isoDay(initialFollow.date) : "";
  const [values, setValues] = useState(initial);
  const [fuDate, setFuDate] = useState(initialFollowDate);
  const [fuAction, setFuAction] = useState(initialFollow.action);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (h: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setValues(v => ({ ...v, [h]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError("");
    const name = (values[nameHeader] || "").trim();
    if (!name) return setError("Give the account a name.");
    const dupe = duplicateOf(ws.accounts, name, account?.key);
    if (dupe) return setError(`“${dupe.name}” is already in the pipeline. Open that account instead of adding it twice.`);
    const next: Record<string, string> = {};
    for (const h of headers) next[h] = (values[h] || "").trim();
    next[nameHeader] = name;
    if (followHeader) {
      const changed = fuDate !== initialFollowDate || fuAction.trim() !== initialFollow.action;
      next[followHeader] = changed ? composeFollowUp(fuDate, fuAction) : initial[followHeader];
    }
    if (roles.stage && !next[roles.stage]) next[roles.stage] = SALES_STAGE_DEFS[0].label;
    setSaving(true);
    try {
      if (account) {
        const changes = Object.fromEntries(headers.filter(h => next[h] !== initial[h]).map(h => [h, next[h]]));
        if (!Object.keys(changes).length) return setError("Nothing was changed.");
        await ws.actions.updateAccount(account.key, changes, `${name} updated`);
        if (roles.stage && changes[roles.stage] !== undefined) ws.afterStageChange(account, changes[roles.stage]);
        onSaved(name);
      } else {
        await ws.actions.addAccount(next);
        ws.logAdded(name, next);
        onSaved(name);
      }
    } catch {
      // the page already showed an error toast; keep the form open with what was typed
    } finally {
      setSaving(false);
    }
  };

  const field = (h: string): ReactNode => {
    const hint = fieldHint(h, headers, roles);
    const v = values[h] ?? "";
    if (h === roles.stage) {
      return (
        <label key={h}>
          <span>{h}</span>
          <select value={v} onChange={set(h)}>{stageChoices(v).map(l => <option key={l} value={l}>{l}</option>)}</select>
          <small className="sub">{hint}</small>
        </label>
      );
    }
    if (h === followHeader) {
      return (
        <div key={h} className="full acct-follow">
          <label>
            <span>{h}: date</span>
            <input type="date" value={fuDate} onChange={e => setFuDate(e.target.value)} />
          </label>
          <label>
            <span>{h}: what happens</span>
            <input value={fuAction} onChange={e => setFuAction(e.target.value)} placeholder="e.g. Call to book the tasting" />
          </label>
          <small className="sub full">{hint} Pick a date so it shows up as due.{account && !initialFollow.date && initialFollow.action ? " The older entry here has no date." : ""}</small>
        </div>
      );
    }
    if (h === roles.lastContact) {
      const isDate = !v || Boolean(parseFollowUp(v).date);
      return (
        <label key={h}>
          <span>{h}</span>
          <input type={isDate ? "date" : "text"} value={isDate && v ? isoDay(parseFollowUp(v).date as Date) : v} onChange={set(h)} />
          <small className="sub">{hint}</small>
        </label>
      );
    }
    if (h === roles.notes) {
      return (
        <label key={h} className="full">
          <span>{h}</span>
          <textarea rows={5} value={v} onChange={set(h)} />
          <small className="sub">{hint}</small>
        </label>
      );
    }
    return (
      <label key={h} className={h === roles.source ? "full" : undefined}>
        <span>{h}{h === nameHeader && <span aria-hidden="true"> *</span>}</span>
        <input value={v} onChange={set(h)} list={h === roles.owner ? "pipeline-owners" : undefined} required={h === nameHeader} />
        <small className="sub">{hint}</small>
      </label>
    );
  };

  return (
    <form className="form-grid acct-form" onSubmit={submit}>
      {groups.map(g => (
        <fieldset className="acct-fieldset full" key={g.title}>
          <legend>{g.title}</legend>
          <div className="form-grid">{g.headers.map(field)}</div>
        </fieldset>
      ))}
      <datalist id="pipeline-owners">{ws.owners.map(o => <option key={o} value={o} />)}</datalist>
      <p className="sub full" style={{ margin: 0 }}>* Required. Everything else can be filled in later, or by logging a touch.</p>
      {error && <p className="form-error full" role="alert">{error}</p>}
      <div className="edit-actions">
        <button className="btn" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        <button className={`btn primary${saving ? " is-pending" : ""}`} type="submit" disabled={saving} aria-busy={saving}>
          {saving && <span className="spinner" aria-hidden="true" />}
          {saving ? "Saving…" : account ? "Save changes" : "Add account"}
        </button>
      </div>
    </form>
  );
}

// "I just spoke to them": one action that records the touch everywhere it belongs.
function TouchForm({ a, onClose }: { a: Account; onClose: () => void }) {
  const ws = usePipeline();
  const { roles, today } = ws;
  const [kind, setKind] = useState<string>("Call");
  const [reached, setReached] = useState(true);
  const [text, setText] = useState("");
  const [fuDate, setFuDate] = useState("");
  const [fuAction, setFuAction] = useState("");
  const [chosenStage, setChosenStage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const suggested = suggestStage(a.stageIdx, reached);
  const currentStage = a.stage || SALES_STAGE_DEFS[0].label;
  const stage = chosenStage ?? (suggested !== a.stageIdx ? SALES_STAGE_DEFS[suggested].label : currentStage);
  const quick = useMemo(() => quickDates(today), [today]);
  const follow = followState(a, today);
  const staleFollow = follow.state === "overdue" || follow.state === "today";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError("");
    const iso = isoDay(today);
    const changes: Record<string, string> = {};
    if (roles.lastContact) changes[roles.lastContact] = iso;
    if (roles.nextFollowUp && (fuDate || fuAction.trim())) changes[roles.nextFollowUp] = composeFollowUp(fuDate, fuAction.trim() || (fuDate ? "Follow up" : ""));
    if (roles.notes) changes[roles.notes] = addNoteLine(a.notes, touchLine({ iso, who: firstName(ws.me), kind, reached, text }));
    if (roles.stage && stage !== a.stage && !(a.stage === "" && stage === SALES_STAGE_DEFS[0].label)) changes[roles.stage] = stage;
    if (!Object.keys(changes).length) return setError("This sheet has no columns for a touch to be saved in.");
    setSaving(true);
    try {
      await ws.actions.updateAccount(a.key, changes, `Touch logged for ${a.name}`);
      const summary = text.replace(/\s*\n\s*/g, " ").trim();
      ws.actions.logActivity(activityRow({
        user: ws.me || "Someone", type: "touch", name: a.name, to: `${kind} · ${reached ? "Reached" : "No answer"}`,
        detail: `${a.name}: ${kind} (${reached ? "reached" : "no answer"})${summary ? ` — ${summary.slice(0, 140)}` : ""}`, now: new Date(),
      }));
      if (changes[roles.stage ?? ""] !== undefined) ws.afterStageChange(a, changes[roles.stage as string]);
      onClose();
    } catch {
      // the page already showed an error toast; keep the form open with what was typed
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      <p className="sub full ctx-line">For: <b>{a.name}</b> · {lastTouchText(a, today)}</p>
      <label>
        <span>What did you do?</span>
        <select value={kind} onChange={e => setKind(e.target.value)}>{touchKinds.map(k => <option key={k}>{k}</option>)}</select>
      </label>
      <label>
        <span>How did it go?</span>
        <select value={reached ? "yes" : "no"} onChange={e => setReached(e.target.value === "yes")}>
          <option value="yes">Reached them</option>
          <option value="no">Could not reach them</option>
        </select>
      </label>
      <label className="full">
        <span>What happened? (optional)</span>
        <textarea rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="e.g. Spoke with the office manager; she wants a tasting for the team" />
      </label>
      <div className="full acct-follow">
        <label>
          <span>Next follow-up date</span>
          <input type="date" value={fuDate} onChange={e => setFuDate(e.target.value)} />
        </label>
        <label>
          <span>What happens next</span>
          <input value={fuAction} onChange={e => setFuAction(e.target.value)} placeholder="e.g. Bring samples" />
        </label>
        <div className="full chips">
          {quick.map(q => <button type="button" key={q.iso} className={`chip sm${fuDate === q.iso ? " selected" : ""}`} onClick={() => setFuDate(q.iso)}>{q.label}</button>)}
        </div>
        {!fuDate && <small className="sub full">{staleFollow ? `This account’s follow-up (${a.followUp.date ? dayLabel(a.followUp.date, false) : "no date"}) has come up. Set a new date, or it will keep showing as ${follow.state === "overdue" ? "overdue" : "due today"}.` : "No follow-up date yet: this account will not show as due."}</small>}
      </div>
      {roles.stage && (
        <label className="full">
          <span>Stage after this touch</span>
          <select value={stage} onChange={e => setChosenStage(e.target.value)}>{stageChoices(currentStage).map(l => <option key={l} value={l}>{l}</option>)}</select>
          <small className="sub">{stage !== currentStage ? `Will move from ${currentStage} to ${stage}.` : reached && a.stageIdx < STAGE.qualified ? "Reached them and they look like a fit? Choose Qualified." : "Leave it if nothing changed."}</small>
        </label>
      )}
      {error && <p className="form-error full" role="alert">{error}</p>}
      <div className="edit-actions">
        <button className="btn" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        <button className={`btn primary${saving ? " is-pending" : ""}`} type="submit" disabled={saving} aria-busy={saving}>
          {saving && <span className="spinner" aria-hidden="true" />}
          {saving ? "Saving…" : "Save touch"}
        </button>
      </div>
    </form>
  );
}

// A task for this account: an ordinary Gardenia task whose Notes cell carries the account, so it is listed on the account.
function TaskForm({ a, onClose }: { a: Account; onClose: () => void }) {
  const ws = usePipeline();
  const [v, setV] = useState({ description: "", owner: ws.myOwner || a.owner, due: "", priority: "P2" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV(cur => ({ ...cur, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError("");
    if (!v.description.trim()) return setError("Say what needs doing.");
    if (!v.owner.trim()) return setError("Say who will do it.");
    setSaving(true);
    try {
      await ws.actions.createTask({ account: a.name, description: v.description.trim(), owner: v.owner.trim(), due: v.due, priority: v.priority });
      onClose();
    } catch {
      // the page already showed an error toast; keep the form open with what was typed
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      <p className="sub full ctx-line">For: <b>{a.name}</b> · it will be listed on this account and on the Tasks tab.</p>
      <label className="full">
        <span>What needs doing? *</span>
        <textarea rows={3} value={v.description} onChange={set("description")} placeholder="e.g. Send the price sheet" />
      </label>
      <label>
        <span>Who will do it? *</span>
        <input value={v.owner} onChange={set("owner")} list="pipeline-task-owners" placeholder="Name" />
        <datalist id="pipeline-task-owners">{ws.owners.map(o => <option key={o} value={o} />)}</datalist>
      </label>
      <label>
        <span>Done by</span>
        <input type="date" value={v.due} onChange={set("due")} />
      </label>
      <label>
        <span>Priority</span>
        <select value={v.priority} onChange={set("priority")}>{["P0", "P1", "P2", "P3"].map(p => <option key={p}>{p}</option>)}</select>
      </label>
      {error && <p className="form-error full" role="alert">{error}</p>}
      <div className="edit-actions">
        <button className="btn" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        <button className={`btn primary${saving ? " is-pending" : ""}`} type="submit" disabled={saving} aria-busy={saving}>
          {saving && <span className="spinner" aria-hidden="true" />}
          {saving ? "Saving…" : "Add task"}
        </button>
      </div>
    </form>
  );
}

// A first order is the moment a prospect becomes a customer: offer to add it to Customers so nobody re-types it.
function WonForm({ a, onClose }: { a: Account; onClose: () => void }) {
  const ws = usePipeline();
  const [v, setV] = useState({ type: "", nextAction: "Follow up on the first order", owner: a.owner || ws.myOwner });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV(cur => ({ ...cur, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await ws.actions.createCustomer(customerRowFor(a, ws.today, v));
      onClose();
    } catch {
      // the page already showed an error toast; keep the form open
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      <p className="sub full ctx-line"><b>{a.name}</b> just placed a first order. Add them to Customers so they are tracked as a customer from here on?</p>
      <label>
        <span>What kind of business?</span>
        <input value={v.type} onChange={set("type")} placeholder="e.g. Dental office" />
      </label>
      <label>
        <span>Who looks after them?</span>
        <input value={v.owner} onChange={set("owner")} />
      </label>
      <label className="full">
        <span>Next step</span>
        <input value={v.nextAction} onChange={set("nextAction")} />
      </label>
      <div className="edit-actions">
        <button className="btn" type="button" onClick={onClose} disabled={saving}>Not now</button>
        <button className={`btn primary${saving ? " is-pending" : ""}`} type="submit" disabled={saving} aria-busy={saving}>
          {saving && <span className="spinner" aria-hidden="true" />}
          {saving ? "Adding…" : "Add to Customers"}
        </button>
      </div>
    </form>
  );
}

function MonthTestForm({ onClose }: { onClose: () => void }) {
  const ws = usePipeline();
  const [text, setText] = useState(ws.monthTest?.Note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!text.trim()) return setError("Write the test in a sentence or two.");
    setSaving(true);
    try {
      await ws.actions.saveMonthTest(text);
      onClose();
    } catch {
      // the page already showed an error toast; keep the text
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      <p className="sub full ctx-line">The one question this month should answer, so everyone can see what the work is for.</p>
      <label className="full">
        <span>This month’s test</span>
        <textarea rows={5} value={text} onChange={e => { setText(e.target.value); setError(""); }} placeholder="e.g. Can our product process make an offer that local companies will taste, buy and repeat?" />
      </label>
      {error && <p className="form-error full" role="alert">{error}</p>}
      <div className="edit-actions">
        <button className="btn" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        <button className={`btn primary${saving ? " is-pending" : ""}`} type="submit" disabled={saving} aria-busy={saving}>
          {saving && <span className="spinner" aria-hidden="true" />}
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

// ── The Sales Pipeline tab ───────────────────────────────────────────────────

function AccountCard({ a }: { a: Account }) {
  const ws = usePipeline();
  const sub = [a.contact, a.value].filter(Boolean).join(" · ");
  return (
    <article className="kanban-card acct-card">
      <button type="button" className="acct-name" onClick={() => ws.open({ kind: "view", key: a.key })}>{a.name}</button>
      {sub && <small>{sub}</small>}
      <div><FollowChip a={a} today={ws.today} /></div>
      <small>{lastTouchText(a, ws.today)}{a.owner ? ` · ${a.owner}` : ""}</small>
      {!isBlank(a.risk) && <span className="badge warn" title="Risk">Risk: {a.risk}</span>}
      <div className="kanban-card-actions">
        <button type="button" className="link-button" onClick={() => ws.open({ kind: "touch", key: a.key })}>Log a touch</button>
        {ws.roles.stage && (
          <select className="acct-move" aria-label={`Move ${a.name} to another stage`} value={a.stage || SALES_STAGE_DEFS[0].label} onChange={e => { ws.moveStage(a, e.target.value).catch(() => {}); }}>
            {stageChoices(a.stage).map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
      </div>
    </article>
  );
}

// Eight stages in one row that scrolls sideways (like a real pipeline), not wrapped into two rows of four.
function SalesBoard({ accounts }: { accounts: Account[] }) {
  const ws = usePipeline();
  const [dragKey, setDragKey] = useState<string | null>(null);
  return (
    <div className="kanban-board sales-board">
      {SALES_STAGE_DEFS.map((stage, i) => {
        const items = accounts.filter(a => a.stageIdx === i);
        return (
          <div
            key={stage.id}
            className="kanban-column"
            onDragOver={e => e.preventDefault()}
            onDrop={() => {
              const a = ws.accounts.find(x => x.key === dragKey);
              if (a && a.stageIdx !== i) ws.moveStage(a, stage.label).catch(() => {});
              setDragKey(null);
            }}
          >
            <div className="kanban-column-header" title={STAGE_HINTS[stage.id]}>
              <span className="status-pill">{stage.label}</span>
              <span className="kanban-count">{items.length}</span>
            </div>
            <div className="kanban-column-body">
              {items.map((a, n) => (
                <div key={`${n}-${a.key}`} draggable onDragStart={() => setDragKey(a.key)} className="kanban-card-wrap">
                  <AccountCard a={a} />
                </div>
              ))}
              {!items.length && <p className="sub kanban-empty">Drop accounts here</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const GROUP_PAGE = 12;

// What to do today: who is due, who is late, and who has no date at all.
function FollowUpsView({ accounts }: { accounts: Account[] }) {
  const ws = usePipeline();
  const groups = useMemo(() => followGroups(accounts, ws.today), [accounts, ws.today]);
  const [all, setAll] = useState<Record<string, boolean>>({});
  if (!accounts.length) return <p className="sub">No accounts match.</p>;
  return (
    <div className="fu-view">
      {FOLLOW_GROUPS.map(g => {
        const list = groups[g.state];
        if (!list.length) return null;
        const shown = all[g.state] ? list : list.slice(0, GROUP_PAGE);
        return (
          <section className="fu-group" key={g.state}>
            <h3>{g.title} <span className="kanban-count">{list.length}</span></h3>
            {g.hint && <p className="sub" style={{ margin: "0 0 4px" }}>{g.hint}</p>}
            {shown.map((a, n) => {
              const open = ws.tasksFor(a).filter(t => !taskIsClosed(t)).length;
              return (
                <div className="fu-row" key={`${n}-${a.key}`}>
                  <div className="fu-main">
                    <button type="button" className="acct-name" onClick={() => ws.open({ kind: "view", key: a.key })}>{a.name}</button> <StageChip a={a} />
                    <div className="fu-meta">
                      <span>{a.followUp.date ? `${dayLabel(a.followUp.date, false)}${a.followUp.action ? ` · ${a.followUp.action}` : ""}` : a.followUp.text || "No next step yet"}</span>
                      <FollowChip a={a} today={ws.today} />
                    </div>
                    <div className="fu-meta">
                      <span>{lastTouchText(a, ws.today)}</span>
                      {a.owner && <span>{a.owner}</span>}
                      {open > 0 && <span>{plural(open, "open task")}</span>}
                      {!isBlank(a.risk) && <span className="badge warn">Risk: {a.risk}</span>}
                    </div>
                  </div>
                  <div className="fu-actions">
                    <button type="button" className="btn primary" onClick={() => ws.open({ kind: "touch", key: a.key })}>Log a touch</button>
                    <button type="button" className="btn" onClick={() => ws.open({ kind: "view", key: a.key })}>Open</button>
                  </div>
                </div>
              );
            })}
            {list.length > GROUP_PAGE && !all[g.state] && (
              <button type="button" className="btn" style={{ marginTop: 6 }} onClick={() => setAll(cur => ({ ...cur, [g.state]: true }))}>Show all {list.length}</button>
            )}
          </section>
        );
      })}
    </div>
  );
}

// Every column the sheet has, in the sheet's order. Click an account's name for the full card.
function AccountsTable({ accounts }: { accounts: Account[] }) {
  const ws = usePipeline();
  const { headers, roles } = ws;
  const [sort, setSort] = useState<{ header: string; dir: 1 | -1 } | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return accounts;
    const value = (a: Account): number | string => {
      if (sort.header === roles.stage) return a.stageIdx;
      if (sort.header === roles.lastContact) return a.lastContact?.getTime() ?? -Infinity;
      if (sort.header === roles.nextFollowUp) return a.followUp.date?.getTime() ?? Infinity;
      return (a.row[sort.header] ?? "").toLowerCase();
    };
    return [...accounts].sort((x, y) => {
      const a = value(x), b = value(y);
      return (a < b ? -1 : a > b ? 1 : 0) * sort.dir;
    });
  }, [accounts, sort, roles]);
  if (!accounts.length) return <p className="sub">No accounts match.</p>;
  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <table className="wk-table acct-table">
          <thead>
            <tr>
              {headers.map(h => (
                <th key={h} scope="col" aria-sort={sort?.header === h ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                  <button type="button" className="sort-btn" onClick={() => setSort(cur => (cur?.header === h ? (cur.dir === 1 ? { header: h, dir: -1 } : null) : { header: h, dir: 1 }))}>
                    {h}{sort?.header === h ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((a, n) => (
              <tr key={`${n}-${a.key}`}>
                {headers.map((h, i) => i === 0 ? (
                  <th scope="row" key={h}><button type="button" className="acct-name" onClick={() => ws.open({ kind: "view", key: a.key })}>{a.name}</button></th>
                ) : (
                  <td key={h} title={a.row[h]}>{h === roles.stage ? <StageChip a={a} /> : a.row[h] || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sub" style={{ margin: "8px 0 0" }}>All {headers.length} columns from the sheet. Click a column heading to sort, or a name to open the account.</p>
    </>
  );
}

export function PipelineTab() {
  const ws = usePipeline();
  const [view, setView] = useState<"followups" | "board" | "all">("followups");
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState(() => (ws.accounts.some(a => isMine(a, ws.me)) ? "mine" : "all"));
  const ownerNames = useMemo(() => [...new Set(ws.accounts.map(a => a.owner).filter(Boolean))].sort(), [ws.accounts]);
  const visible = useMemo(
    () => ws.accounts.filter(a => (owner === "all" || (owner === "mine" ? isMine(a, ws.me) : nameKey(a.owner) === nameKey(owner))) && matchesSearch(a, query)),
    [ws.accounts, owner, ws.me, query],
  );
  const perStage = SALES_STAGE_DEFS.map((s, i) => ({ s, n: visible.filter(a => a.stageIdx === i).length })).filter(x => x.n > 0);

  if (!ws.accounts.length) {
    return (
      <section className="card">
        <p className="sub" style={{ marginTop: 0 }}>No accounts in the pipeline yet. Add the first one and it will show up in all three views.</p>
        <button type="button" className="btn primary" onClick={() => ws.open({ kind: "add" })}>＋ Add account</button>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="pipe-toolbar">
        <div className="chips" aria-label="How to look at the pipeline">
          {([["followups", "Follow-ups"], ["board", "▤ Board"], ["all", "All columns"]] as const).map(([id, label]) => (
            <button key={id} type="button" className={`chip ${view === id ? "selected" : ""}`} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>
          ))}
        </div>
        <input className="grow" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search accounts, contacts, notes…" aria-label="Search the pipeline" />
        <select value={owner} onChange={e => setOwner(e.target.value)} aria-label="Whose accounts">
          {ws.me && ws.accounts.some(a => isMine(a, ws.me)) && <option value="mine">My accounts</option>}
          <option value="all">Everyone’s accounts</option>
          {ownerNames.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <button type="button" className="btn primary" onClick={() => ws.open({ kind: "add" })}>＋ Add account</button>
      </div>
      <p className="sub stage-strip">
        {visible.length} of {ws.accounts.length} accounts{perStage.length ? ": " : ""}
        {perStage.map(({ s, n }, i) => <span key={s.id}>{i ? " · " : ""}<b>{n}</b> {s.label}</span>)}
      </p>
      {view === "followups" && <FollowUpsView accounts={visible} />}
      {view === "board" && <SalesBoard accounts={visible} />}
      {view === "all" && <AccountsTable accounts={visible} />}
    </section>
  );
}

// ── Summary and KPIs: the client's own headline numbers ──────────────────────

const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "—");

function NumberTiles() {
  const { numbers } = usePipeline();
  const tiles = [
    { label: NUMBER_HELP.prospects.label, value: String(numbers.prospects), detail: "In the pipeline", tone: "lav" },
    { label: NUMBER_HELP.contacts.label, value: String(numbers.contacts), detail: `${pct(numbers.contacts, numbers.prospects)} of prospects`, tone: "blue" },
    { label: NUMBER_HELP.tastings.label, value: String(numbers.tastings), detail: `${pct(numbers.tastings, numbers.prospects)} of prospects`, tone: "sage" },
    { label: NUMBER_HELP.standing.label, value: String(numbers.standing), detail: `${pct(numbers.standing, numbers.prospects)} of prospects`, tone: "mint" },
    { label: NUMBER_HELP.revenue.label, value: "—", detail: "Not reported yet", tone: "" },
  ];
  return (
    <section className="kpis kpis-5 pipe-kpis" aria-label="Sales numbers">
      {tiles.map(t => <div className={`card kpi ${t.tone}`} key={t.label}><span className="label">{t.label}</span><strong>{t.value}</strong><small>{t.detail}</small></div>)}
    </section>
  );
}

function HowCounted() {
  return (
    <details className="explain-details">
      <summary>How these numbers are counted</summary>
      <dl className="explain-list">
        {Object.values(NUMBER_HELP).map(h => <div key={h.label} style={{ display: "contents" }}><dt>{h.label}</dt><dd>{h.how}</dd></div>)}
      </dl>
    </details>
  );
}

function MonthTest() {
  const ws = usePipeline();
  const t = ws.monthTest;
  return (
    <div className="month-test">
      <div className="list-toolbar" style={{ marginBottom: 2 }}>
        <b>This month’s test</b>
        <button type="button" className="link-button" onClick={() => ws.open({ kind: "test" })}>{t ? "Edit" : "＋ Set it"}</button>
      </div>
      {t ? (
        <>
          <p style={{ margin: "0 0 4px", whiteSpace: "pre-wrap" }}>{t.Note}</p>
          <small className="sub">{t.Timestamp ? `Set ${new Date(t.Timestamp).toLocaleDateString()}` : ""}{t.Author ? ` by ${t.Author}` : ""}</small>
        </>
      ) : (
        <p className="sub" style={{ margin: 0 }}>No test set yet. It is the one question this month should answer, for example “Will local offices taste, buy and repeat?”</p>
      )}
    </div>
  );
}

export function PipelineHealth({ onOpenPipeline }: { onOpenPipeline: () => void }) {
  const ws = usePipeline();
  const groups = useMemo(() => followGroups(ws.accounts, ws.today), [ws.accounts, ws.today]);
  const due = [...groups.overdue, ...groups.today, ...groups.week].slice(0, 5);
  const untouched = ws.accounts.filter(a => needsTouch(a, ws.today)).length;
  return (
    <section className="card store-health" style={{ marginBottom: 16 }} aria-label="Sales pipeline">
      <div className="list-toolbar">
        <h2 className="section-title" style={{ margin: 0 }}>Sales pipeline</h2>
        <button type="button" className="btn" onClick={onOpenPipeline}>Open the pipeline →</button>
      </div>
      <MonthTest />
      <NumberTiles />
      <HowCounted />
      <h3 className="viz-title" style={{ margin: "12px 0 4px" }}>Follow-ups</h3>
      <div className="health-counts" aria-label="Follow-ups by date">
        {FOLLOW_GROUPS.map(g => (
          <span className="health-count" key={g.state}><span className={`due-chip ${g.state}`}>{g.title}</span> <b>{groups[g.state].length}</b></span>
        ))}
      </div>
      {due.length ? due.map((a, i) => (
        <div className="mini-row" key={`${i}-${a.key}`}>
          <span>
            <button type="button" className="acct-name" onClick={() => ws.open({ kind: "view", key: a.key })}>{a.name}</button>
            <br /><small>{a.followUp.date ? `${dayLabel(a.followUp.date, false)}${a.followUp.action ? ` · ${a.followUp.action}` : ""}` : a.followUp.text}</small>
          </span>
          <button type="button" className="link-button" onClick={() => ws.open({ kind: "touch", key: a.key })}>Log a touch</button>
        </div>
      )) : <p className="sub" style={{ margin: 0 }}>Nothing is due in the next 7 days.{groups.nodate.length ? ` ${plural(groups.nodate.length, "account")} ${groups.nodate.length === 1 ? "has" : "have"} no follow-up date.` : ""}</p>}
      {untouched > 0 && <p className="sub" style={{ margin: "8px 0 0" }}>{plural(untouched, "account")} past the research stage {untouched === 1 ? "has" : "have"} no contact logged in the last two weeks.</p>}
    </section>
  );
}

export function PipelineKpis() {
  const ws = usePipeline();
  const stages = useMemo(() => SALES_STAGE_DEFS.map((s, i) => ({ label: s.label, value: ws.accounts.filter(a => a.stageIdx === i).length })), [ws.accounts]);
  return (
    <section className="card" style={{ marginBottom: 16 }} aria-label="Sales numbers">
      <h2 className="section-title">Sales numbers</h2>
      <MonthTest />
      <NumberTiles />
      <HowCounted />
      <div className="viz-grid"><SalesFunnelChart stages={stages} /></div>
    </section>
  );
}

// ── Weekly Closing: what moved -> what is still open -> wrap-up ──────────────

type WrapFields = { wins: string; misses: string; blockers: string; next: string };
const NO_FIELDS: WrapFields = { wins: "", misses: "", blockers: "", next: "" };

export function CloseSalesWeek({ wraps, onSave }: {
  /** Wrap-ups already saved for Gardenia's Fire (to say when the week being closed already has one). */
  wraps: SheetRow[];
  /** Save a note under this ISO week key (the page shows the toast; throws on failure). */
  onSave: (note: string, weekKey: string) => Promise<void>;
}) {
  const ws = usePipeline();
  const [offset, setOffset] = useState<0 | -1>(0);
  const [fields, setFields] = useState<WrapFields>(NO_FIELDS);
  const [saving, setSaving] = useState(false);
  const span = useMemo(() => weekSpan(new Date(ws.now), offset), [ws.now, offset]);
  const summary = useMemo(() => weekSummary(ws.events, span), [ws.events, span]);
  const groups = useMemo(() => followGroups(ws.accounts, ws.today), [ws.accounts, ws.today]);
  const untouched = ws.accounts.filter(a => needsTouch(a, ws.today));
  const moves = ws.events.filter(e => e.type === "move" && e.at >= span.start && e.at < span.end);
  const already = wraps.filter(w => w["Source ID"] === span.key);
  const empty = !Object.values(fields).some(v => v.trim());
  const set = (name: keyof WrapFields) => (e: React.ChangeEvent<HTMLTextAreaElement>) => setFields(f => ({ ...f, [name]: e.target.value }));

  const save = async () => {
    if (saving || empty) return;
    const parts = ([["Wins", fields.wins], ["Misses", fields.misses], ["Blockers", fields.blockers], ["Next week", fields.next]] as const)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `${k}: ${v.trim()}`);
    setSaving(true);
    try {
      await onSave([numbersLine(ws.numbers, summary, span), ...parts].join("\n"), span.key);
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
        <NumberTiles />
        <p className="sub" style={{ margin: "6px 0 0" }}>
          {plural(summary.touches.length, "touch", "touches")} logged across {plural(summary.accountsTouched, "account")} ({summary.reached} reached someone) · {summary.advanced.length} moved forward · {plural(summary.added.length, "new account")}.
        </p>
      </div>

      <div className="close-step">
        <h3><span className="step-num">2</span> What moved</h3>
        {moves.length ? moves.map((e, i) => (
          <div className="mini-row" key={i}><b>{e.name}</b><small>{e.from || "—"} → {e.to}{e.user ? ` · ${e.user}` : ""}</small></div>
        )) : <p className="sub" style={{ margin: 0 }}>No accounts changed stage in this week. Moves are recorded when someone drags a card or changes the stage.</p>}
      </div>

      <div className="close-step">
        <h3><span className="step-num">3</span> What is still open</h3>
        <p className="sub" style={{ margin: "0 0 6px" }}>
          <b>{groups.overdue.length}</b> overdue · <b>{groups.today.length + groups.week.length}</b> due in the next week · <b>{groups.nodate.length}</b> with no date · <b>{untouched.length}</b> not touched in 2 weeks · <b>{ws.openTasks.length}</b> open {ws.openTasks.length === 1 ? "task" : "tasks"}
        </p>
        {[...groups.overdue, ...untouched.filter(a => !groups.overdue.includes(a))].slice(0, 6).map((a, i) => (
          <div className="mini-row" key={`${i}-${a.key}`}>
            <button type="button" className="acct-name" onClick={() => ws.open({ kind: "view", key: a.key })}>{a.name}</button>
            <small>{followState(a, ws.today).state === "overdue" ? `follow-up overdue · ` : ""}{lastTouchText(a, ws.today)}</small>
          </div>
        ))}
      </div>

      <div className="close-step">
        <h3><span className="step-num">4</span> Wrap-up · {span.key}</h3>
        <p className="sub" style={{ margin: "0 0 8px" }}>
          <button type="button" className="btn" onClick={() => setFields(weekWrapUp({ accounts: ws.accounts, summary, today: ws.today, openTasks: ws.openTasks }))}>Fill in from the pipeline</button>{" "}
          It writes a first draft you can change. The week’s pipeline numbers are saved with the wrap-up.
        </p>
        {already.length > 0 && <p className="sub" style={{ margin: "0 0 8px" }}>A wrap-up for {span.key} was already saved{already[0].Timestamp ? ` on ${new Date(already[0].Timestamp).toLocaleDateString()}` : ""}. Saving adds another.</p>}
        <div className="form-grid">
          <label className="full"><span>Wins — what went well</span><textarea rows={4} value={fields.wins} onChange={set("wins")} placeholder="Accounts that moved forward, tastings booked, first orders…" /></label>
          <label className="full"><span>Misses — what slipped</span><textarea rows={4} value={fields.misses} onChange={set("misses")} placeholder="Follow-ups that were missed, and why" /></label>
          <label className="full"><span>Blockers — what’s in the way</span><textarea rows={4} value={fields.blockers} onChange={set("blockers")} placeholder="Anything that needs a decision or help" /></label>
          <label className="full"><span>Next week’s priorities</span><textarea rows={4} value={fields.next} onChange={set("next")} placeholder="The 2–3 things that matter most next week" /></label>
          <button type="button" className={`btn primary${saving ? " is-pending" : ""}`} disabled={empty || saving} aria-busy={saving} onClick={save}>
            {saving && <span className="spinner" aria-hidden="true" />}
            {saving ? "Saving…" : `Save ${span.key} wrap-up`}
          </button>
        </div>
      </div>
    </section>
  );
}
