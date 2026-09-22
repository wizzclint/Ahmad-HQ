"use client";

import { useMemo, useState } from "react";
import type { SheetRow } from "@/lib/hq-types";
import { STATUS_LABEL, attention, formatValue, ksiSummary, parseDate, parseNum, scorecard, weeklySeries, type Status, type Tile } from "@/lib/hq-scorecard";
import { ChartCard, Empty, TipBox, TrendChart, useTip } from "./charts";

// The Edible - Store KPI scorecard: the report's weekly numbers judged against its targets, what needs
// attention, the sales trend and the monthly KSI review. Tables for entering the data sit beneath it
// (rendered by the page); this component only presents.

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

// One row per week, raw inputs only — the scorecard derives the rest, so nobody types a percentage.
const WEEK_FIELDS: { name: string; label: string; required?: boolean; kind?: "date" | "text"; hint?: string }[] = [
  { name: "Week Ending", label: "Week ending", kind: "date", required: true, hint: "Tap the box to open a calendar — this form is for a NEW week only. To fix a week that's already listed, use Edit in the “Weekly numbers” table below instead." },
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

export function WeeklyEntryForm({ existing, onAdd, onInvalid }: {
  existing: SheetRow[];
  onAdd: (row: Record<string, string>) => Promise<void>;
  onInvalid: (message: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => setValues(v => ({ ...v, [name]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const week = parseDate(values["Week Ending"]);
    if (!week) return onInvalid("Choose the week-ending date.");
    if (weeklySeries(existing).some(w => w.weekEnding.getTime() === week.getTime())) {
      return onInvalid(`Week ending ${dateLabelYear(week)} is already entered — this form only adds a new week. Scroll down to “Weekly numbers” below and press Edit on that row to change its numbers.`);
    }
    for (const f of WEEK_FIELDS) {
      const v = (values[f.name] || "").trim();
      if (f.required && !v) return onInvalid(`${f.label} is required.`);
      if (v && f.kind !== "text" && f.kind !== "date" && parseNum(v) === null) return onInvalid(`${f.label} must be a number.`);
    }
    const row: Record<string, string> = {};
    for (const f of WEEK_FIELDS) row[f.name] = (values[f.name] || "").trim();
    row["Week Ending"] = week.toISOString().slice(0, 10);
    setSaving(true);
    try {
      await onAdd(row);
      setValues({});
    } catch {
      // the page already showed an error toast; keep what was typed
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
      <button className={`btn primary${saving ? " is-pending" : ""}`} type="submit" disabled={saving} aria-busy={saving}>
        {saving && <span className="spinner" aria-hidden="true" />}
        {saving ? "Adding…" : "Add week"}
      </button>
    </form>
  );
}

export function EdibleScorecard({ weekly, targets, ksiReview }: { weekly: SheetRow[]; targets: SheetRow[]; ksiReview: SheetRow[] }) {
  const weeks = useMemo(() => weeklySeries(weekly), [weekly]);
  const [picked, setPicked] = useState<number | null>(null);
  const [now] = useState(() => Date.now()); // read once, so rendering stays pure
  const idx = picked !== null && picked < weeks.length ? picked : weeks.length - 1;
  const week = weeks[idx];
  const previous = idx > 0 ? weeks[idx - 1] : null;
  const tiles = useMemo(() => (week ? scorecard(week, previous, targets) : []), [week, previous, targets]);
  const flagged = useMemo(() => attention(tiles), [tiles]);

  if (!week) {
    return (
      <>
        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="section-title">Store scorecard</h2>
          <p className="sub" style={{ margin: 0 }}>No weekly numbers yet. Add the first week in “Weekly numbers” below (net sales, orders, labor and so on) and this scorecard fills in: status against your targets, what needs attention, and the sales trend.</p>
        </section>
        <div className="viz-grid"><KsiReview rows={ksiReview} /></div>
      </>
    );
  }

  const daysOld = Math.floor((now - week.weekEnding.getTime()) / 86400000);
  const stale = idx === weeks.length - 1 && daysOld > 10;
  const recent = weeks.slice(-6);
  const offset = weeks.length - recent.length;
  const shown = weeks.filter(w => w.netSales !== null);
  const hasTargets = shown.length > 0 && shown.every(w => w.salesTarget !== null);
  const kFmt = (v: number) => (v >= 1000 ? `$${+(v / 1000).toFixed(1)}K` : `$${v}`);

  return (
    <>
      <section className="card score-head" style={{ marginBottom: 12 }}>
        <div className="list-toolbar" style={{ marginBottom: 6 }}>
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>Store scorecard · Week ending {dateLabelYear(week.weekEnding)}</h2>
            {stale && <p className="sub score-stale">This is {daysOld} days old — add the latest week in “Weekly numbers” below.</p>}
          </div>
          <div className="chips" role="group" aria-label="Choose a week">
            {recent.map((w, i) => (
              <button key={w.weekEnding.toISOString()} className={`chip ${offset + i === idx ? "selected" : ""}`} aria-pressed={offset + i === idx} onClick={() => setPicked(offset + i)}>
                {dateLabel(w.weekEnding)}
              </button>
            ))}
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
          note="Weekly, as entered"
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
    </>
  );
}
