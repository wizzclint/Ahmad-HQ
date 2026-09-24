"use client";

import { useCallback, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent, PointerEvent, ReactNode } from "react";
import { STAGES, type AreaProgress, type StageKey, type WeekBin } from "@/lib/hq-progress";

// Home dashboard charts. Plain HTML/SVG, no charting library. Colors come from the
// --stage-* / --series-* tokens on `.viz` in globals.css; text always uses ink tokens,
// never a series color. Every chart has a hover/focus tooltip and a "View as table" twin.

type Tip = {
  x: number;
  y: number;
  w: number;
  flip?: boolean;
  title: string;
  rows: { color?: string; label: string; value: string }[];
};

// Hover + keyboard-focus tooltip for bar-type marks: follows the pointer, or anchors to the focused mark.
export function useTip() {
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const place = (clientX: number, clientY: number, title: string, rows: Tip["rows"]) => {
    const r = box.current?.getBoundingClientRect();
    if (r) setTip({ x: clientX - r.left, y: clientY - r.top, w: r.width, title, rows });
  };
  return {
    box,
    tip,
    hide: () => setTip(null),
    onPointer: (title: string, rows: Tip["rows"]) => (e: PointerEvent) => place(e.clientX, e.clientY, title, rows),
    onFocus: (title: string, rows: Tip["rows"]) => (e: FocusEvent<HTMLElement>) => {
      const t = e.currentTarget.getBoundingClientRect();
      place(t.left + t.width / 2, t.top, title, rows);
    },
  };
}

// Tooltip: value leads, label follows; series keyed by a short color stroke, not a box.
export function TipBox({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  const half = 96; // half the tooltip's max width, so it never spills out of the card
  const left = Math.min(Math.max(tip.x, half), Math.max(tip.w - half, half));
  return (
    <div className={`viz-tip${tip.flip ? " below" : ""}`} role="tooltip" style={{ left, top: tip.y }}>
      <b className="viz-tip-title">{tip.title}</b>
      {tip.rows.map((r, i) => (
        <div className="viz-tip-row" key={i}>
          {r.color && <span className="viz-key-line" style={{ background: r.color }} />}
          <strong>{r.value}</strong>
          <span>{r.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  return (
    <ul className="viz-legend">
      {items.map(i => (
        <li key={i.label}>
          <span className={i.line ? "viz-key-line" : "viz-key"} style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export function ChartCard({ title, note, legend, actions, table, className = "", children }: {
  title: string;
  note?: string;
  legend?: ReactNode;
  /** Controls shown at the right of the card header (e.g. a date-range picker). */
  actions?: ReactNode;
  table: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <figure className={`card viz ${className}`}>
      <figcaption className={actions ? "viz-cap" : undefined}>
        <div>
          <h3 className="viz-title">{title}</h3>
          {note && <p className="viz-note">{note}</p>}
        </div>
        {actions}
      </figcaption>
      {legend}
      {children}
      <details className="viz-table">
        <summary>View as table</summary>
        {table}
      </details>
    </figure>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => <p className="viz-empty">{children}</p>;

// ── Overall progress: one number, so a hero figure + meter rather than a chart ──
export function ProgressHero({ pct, done, total, open, counts }: { pct: number; done: number; total: number; open: number; counts: Record<StageKey, number> }) {
  return (
    <figure className="card viz viz-hero">
      <figcaption><h3 className="viz-title">Overall progress</h3></figcaption>
      <div className="viz-hero-figure">{pct}<span>%</span></div>
      <p className="viz-note">{total ? `${done} of ${total} tasks complete · ${open} still open` : "No tasks yet"}</p>
      <div className="viz-meter" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Share of tasks complete">
        <span style={{ width: `${pct}%` }} />
      </div>
      <ul className="viz-breakdown">
        {STAGES.map(s => (
          <li key={s.key}>
            <span className="viz-key" style={{ background: `var(--stage-${s.key})` }} />
            {s.label}
            <strong>{counts[s.key]}</strong>
          </li>
        ))}
      </ul>
    </figure>
  );
}

// ── Progress by area: each area's tasks split by stage, all bars to 100% so areas compare on composition ──
export function AreaProgressChart({ areas }: { areas: AreaProgress[] }) {
  const { box, tip, hide, onPointer, onFocus } = useTip();
  return (
    <ChartCard
      className="viz-wide"
      title="Progress by area"
      note="Tasks by stage. Finished work sits on the left, so you can compare areas at a glance."
      legend={<Legend items={STAGES.map(s => ({ label: s.label, color: `var(--stage-${s.key})` }))} />}
      table={(
        <table>
          <thead><tr><th>Area</th>{STAGES.map(s => <th key={s.key}>{s.label}</th>)}<th>Total</th><th>% done</th></tr></thead>
          <tbody>
            {areas.map(a => (
              <tr key={a.id}><th scope="row">{a.label}</th>{STAGES.map(s => <td key={s.key}>{a.counts[s.key]}</td>)}<td>{a.total}</td><td>{a.pct}%</td></tr>
            ))}
          </tbody>
        </table>
      )}
    >
      {areas.length ? (
        <div className="viz-plot" ref={box} onPointerLeave={hide}>
          {areas.map(a => {
            const segs = STAGES.map(s => ({ ...s, value: a.counts[s.key] })).filter(s => s.value > 0);
            return (
              <div className="viz-row" key={a.id}>
                <span className="viz-row-label">{a.label}</span>
                <div className="viz-stack" role="img" aria-label={`${a.label}: ${a.pct}% done, ${a.total} tasks`}>
                  {segs.map((s, i) => {
                    const rows = [{ color: `var(--stage-${s.key})`, label: s.label, value: `${s.value} of ${a.total}` }];
                    return (
                      <span
                        key={s.key}
                        className={`viz-seg${i === segs.length - 1 ? " last" : ""}`}
                        style={{ flexGrow: s.value, background: `var(--stage-${s.key})` }}
                        tabIndex={0}
                        onPointerMove={onPointer(a.label, rows)}
                        onFocus={onFocus(a.label, rows)}
                        onBlur={hide}
                      />
                    );
                  })}
                </div>
                <span className="viz-row-value"><strong>{a.pct}%</strong> · {a.counts.done}/{a.total}</span>
              </div>
            );
          })}
          <TipBox tip={tip} />
        </div>
      ) : <Empty>No tasks yet. Assign one from Capture / Inbox and it will show up here.</Empty>}
    </ChartCard>
  );
}

// ── Sales pipeline: accounts per stage. One series, one color; stage order is the row order. ──
export function SalesFunnelChart({ stages }: { stages: { label: string; value: number }[] }) {
  const { box, tip, hide, onPointer, onFocus } = useTip();
  const total = stages.reduce((n, s) => n + s.value, 0);
  const max = Math.max(...stages.map(s => s.value), 1);
  return (
    <ChartCard
      className="viz-half"
      title="Sales pipeline"
      note={total ? `${total} accounts in Gardenia's Fire, by stage` : "Gardenia's Fire accounts, by stage"}
      table={(
        <table>
          <thead><tr><th>Stage</th><th>Accounts</th></tr></thead>
          <tbody>{stages.map(s => <tr key={s.label}><th scope="row">{s.label}</th><td>{s.value}</td></tr>)}</tbody>
        </table>
      )}
    >
      {total ? (
        <div className="viz-plot" ref={box} onPointerLeave={hide}>
          {stages.map(s => {
            const rows = [{ label: s.value === 1 ? "account" : "accounts", value: String(s.value) }];
            return (
              <div
                className="viz-row viz-row-bar"
                key={s.label}
                tabIndex={0}
                onPointerMove={onPointer(s.label, rows)}
                onFocus={onFocus(s.label, rows)}
                onBlur={hide}
              >
                <span className="viz-row-label">{s.label}</span>
                <div className="viz-bar-wrap">
                  {s.value > 0 && <span className="viz-bar" style={{ width: `${(s.value / max) * 100}%` }} />}
                  <span className="viz-bar-val">{s.value}</span>
                </div>
              </div>
            );
          })}
          <TipBox tip={tip} />
        </div>
      ) : <Empty>No accounts in the pipeline yet.</Empty>}
    </ChartCard>
  );
}

// ── Trend: a weekly line chart, used for tasks (created vs completed) and for store sales (actual vs target) ──
const weekLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

// Measures its container so the SVG is drawn at real pixel size (crisp text at any width).
// A callback ref measures the moment the element attaches, so the first paint already has a width;
// the ResizeObserver then only has to track later changes (window resize, sidebar, orientation).
function useWidth<T extends HTMLElement>() {
  const [w, setW] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    setW(Math.round(el.getBoundingClientRect().width));
    const ro = new ResizeObserver(entries => setW(Math.round(entries[0].contentRect.width)));
    ro.observe(el);
    observer.current = ro;
  }, []);
  return [ref, w] as const;
}

export type TrendSeries = { key: string; label: string; color: string; values: number[] };

// Four evenly spaced axis ticks from 0. Counts get whole-number ticks; other measures get round ones.
function trendTicks(max: number, integer: boolean): number[] {
  if (integer) {
    const step = Math.ceil(Math.max(3, max) / 3);
    return [0, step, step * 2, step * 3];
  }
  const raw = Math.max(max, 1) / 3;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / pow;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * pow;
  return [0, step, step * 2, step * 3];
}

export function TrendChart({ title, note, actions, className = "viz-half", labels, tipTitles, series, formatValue = String, formatTick = String, integerTicks = false, tableLabel = "Week of", ariaLabel, empty }: {
  title: string;
  note?: string;
  actions?: ReactNode;
  className?: string;
  labels: string[];
  tipTitles: string[];
  series: TrendSeries[];
  formatValue?: (n: number) => string;
  formatTick?: (n: number) => string;
  integerTicks?: boolean;
  tableLabel?: string;
  ariaLabel: string;
  /** When set, shown instead of the plot (e.g. "nothing to chart yet"). */
  empty?: ReactNode;
}) {
  const [box, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const n = labels.length;
  const H = 220;
  const M = { t: 14, r: 14, b: 28, l: integerTicks ? 30 : 48 };
  const innerW = Math.max(width - M.l - M.r, 10);
  const innerH = H - M.t - M.b;
  const ticks = trendTicks(Math.max(0, ...series.flatMap(s => s.values)), integerTicks);
  const yMax = ticks[3];
  const x = (i: number) => M.l + (n > 1 ? (i * innerW) / (n - 1) : innerW / 2);
  const y = (v: number) => M.t + innerH - (v / yMax) * innerH;
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  // Label every `step`-th point, counting back from the newest so the latest label always shows.
  // Labels are ~40px wide: label every point while there is room (46px apart), otherwise space them
  // at least 60px apart, which also keeps the right-aligned newest label clear of its neighbour.
  const perPoint = innerW / Math.max(1, n - 1);
  const step = perPoint >= 46 ? 1 : Math.ceil(60 / perPoint);

  const nearest = (clientX: number, el: SVGRectElement) => {
    const r = el.getBoundingClientRect();
    return Math.min(n - 1, Math.max(0, Math.round(((clientX - r.left) / r.width) * (n - 1))));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); setActive(a => Math.max(0, (a ?? n) - 1)); }
    if (e.key === "ArrowRight") { e.preventDefault(); setActive(a => Math.min(n - 1, (a ?? -1) + 1)); }
    if (e.key === "Escape") setActive(null);
  };

  let tip: Tip | null = null;
  if (active !== null && width > 0 && active < n) {
    const ys = series.map(s => y(s.values[active]));
    const top = Math.min(...ys);
    tip = {
      x: x(active),
      y: top < 96 ? Math.max(...ys) : top,
      w: width,
      flip: top < 96,
      title: tipTitles[active],
      rows: series.map(s => ({ color: s.color, label: s.label.toLowerCase(), value: formatValue(s.values[active]) })),
    };
  }

  return (
    <ChartCard
      className={className}
      title={title}
      note={note}
      actions={actions}
      legend={<Legend items={series.map(s => ({ label: s.label, color: s.color, line: true }))} />}
      table={(
        <table>
          <thead><tr><th>{tableLabel}</th>{series.map(s => <th key={s.key}>{s.label}</th>)}</tr></thead>
          <tbody>{labels.map((l, i) => <tr key={i}><th scope="row">{l}</th>{series.map(s => <td key={s.key}>{formatValue(s.values[i])}</td>)}</tr>)}</tbody>
        </table>
      )}
    >
      {empty ? (
        <Empty>{empty}</Empty>
      ) : (
        <div className="viz-plot viz-line" ref={box} tabIndex={0} onKeyDown={onKey} onFocus={() => setActive(a => a ?? n - 1)} onBlur={() => setActive(null)}>
          {width > 0 && (
            <svg width={width} height={H} role="img" aria-label={ariaLabel}>
              {ticks.map(t => (
                <g key={t}>
                  <line x1={M.l} x2={M.l + innerW} y1={y(t)} y2={y(t)} className={t === 0 ? "viz-axis" : "viz-hairline"} />
                  <text x={M.l - 8} y={y(t) + 4} textAnchor="end" className="viz-tick">{formatTick(t)}</text>
                </g>
              ))}
              {labels.map((l, i) => ((n - 1 - i) % step === 0 ? (
                <text key={i} x={x(i)} y={H - 8} textAnchor={i === n - 1 && step > 1 ? "end" : "middle"} className="viz-tick">{l}</text>
              ) : null))}
              {active !== null && <line x1={x(active)} x2={x(active)} y1={M.t} y2={M.t + innerH} className="viz-cross" />}
              {series.map(s => (
                <g key={s.key}>
                  <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {[n - 1, ...(active !== null && active !== n - 1 ? [active] : [])].map(i => (
                    <circle key={i} cx={x(i)} cy={y(s.values[i])} r={4} fill={s.color} className="viz-dot" />
                  ))}
                </g>
              ))}
              <rect
                x={M.l}
                y={M.t}
                width={innerW}
                height={innerH}
                fill="transparent"
                onPointerMove={e => setActive(nearest(e.clientX, e.currentTarget))}
                onPointerLeave={() => setActive(null)}
              />
            </svg>
          )}
          <TipBox tip={tip} />
        </div>
      )}
    </ChartCard>
  );
}

export function ActivityTrendChart({ bins, total }: { bins: WeekBin[]; total: number }) {
  return (
    <TrendChart
      title="Tasks created vs completed"
      note="Per week, last 8 weeks"
      labels={bins.map(b => weekLabel(b.start))}
      tipTitles={bins.map(b => `Week of ${weekLabel(b.start)}`)}
      series={[
        { key: "completed", label: "Completed", color: "var(--series-1)", values: bins.map(b => b.completed) },
        { key: "created", label: "Created", color: "var(--series-2)", values: bins.map(b => b.created) },
      ]}
      integerTicks
      ariaLabel={`Tasks created and completed per week, last ${bins.length} weeks`}
      empty={total === 0 ? "No dated activity yet. This fills in as tasks are assigned and moved to Done." : undefined}
    />
  );
}

export function ProgressPanel({ overall, areas, funnel, weekly }: {
  overall: { pct: number; done: number; total: number; open: number; counts: Record<StageKey, number> };
  areas: AreaProgress[];
  funnel: { label: string; value: number }[];
  weekly: { bins: WeekBin[]; total: number };
}) {
  return (
    <div className="viz-grid">
      <ProgressHero {...overall} />
      <AreaProgressChart areas={areas} />
      <SalesFunnelChart stages={funnel} />
      <ActivityTrendChart bins={weekly.bins} total={weekly.total} />
    </div>
  );
}
