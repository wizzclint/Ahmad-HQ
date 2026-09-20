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
function useTip() {
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
function TipBox({ tip }: { tip: Tip | null }) {
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

function Legend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
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

function ChartCard({ title, note, legend, table, className = "", children }: {
  title: string;
  note?: string;
  legend?: ReactNode;
  table: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <figure className={`card viz ${className}`}>
      <figcaption>
        <h3 className="viz-title">{title}</h3>
        {note && <p className="viz-note">{note}</p>}
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

const Empty = ({ children }: { children: ReactNode }) => <p className="viz-empty">{children}</p>;

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

// ── Trend: tasks created vs completed per week ──
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

export function ActivityTrendChart({ bins, total }: { bins: WeekBin[]; total: number }) {
  const [box, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const H = 220, M = { t: 14, r: 14, b: 28, l: 30 };
  const n = bins.length;
  const innerW = Math.max(width - M.l - M.r, 10);
  const innerH = H - M.t - M.b;
  const step = Math.ceil(Math.max(3, ...bins.map(b => Math.max(b.created, b.completed))) / 3);
  const yMax = step * 3;
  const ticks = [0, step, step * 2, step * 3];
  const x = (i: number) => M.l + (n > 1 ? (i * innerW) / (n - 1) : innerW / 2);
  const y = (v: number) => M.t + innerH - (v / yMax) * innerH;
  const series = [
    { key: "completed", label: "Completed", color: "var(--series-1)", values: bins.map(b => b.completed) },
    { key: "created", label: "Created", color: "var(--series-2)", values: bins.map(b => b.created) },
  ];
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  const everyOther = innerW / n < 46;

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
  if (active !== null && width > 0) {
    const top = Math.min(y(bins[active].created), y(bins[active].completed));
    tip = {
      x: x(active),
      y: top < 96 ? Math.max(y(bins[active].created), y(bins[active].completed)) : top,
      w: width,
      flip: top < 96,
      title: `Week of ${weekLabel(bins[active].start)}`,
      rows: series.map(s => ({ color: s.color, label: s.label.toLowerCase(), value: String(s.values[active]) })),
    };
  }

  return (
    <ChartCard
      className="viz-half"
      title="Tasks created vs completed"
      note="Per week, last 8 weeks"
      legend={<Legend items={series.map(s => ({ label: s.label, color: s.color, line: true }))} />}
      table={(
        <table>
          <thead><tr><th>Week of</th><th>Created</th><th>Completed</th></tr></thead>
          <tbody>{bins.map(b => <tr key={b.start}><th scope="row">{weekLabel(b.start)}</th><td>{b.created}</td><td>{b.completed}</td></tr>)}</tbody>
        </table>
      )}
    >
      {total === 0 ? (
        <Empty>No dated activity yet. This fills in as tasks are assigned and moved to Done.</Empty>
      ) : (
        <div className="viz-plot viz-line" ref={box} tabIndex={0} onKeyDown={onKey} onFocus={() => setActive(a => a ?? n - 1)} onBlur={() => setActive(null)}>
          {width > 0 && (
            <svg width={width} height={H} role="img" aria-label={`Tasks created and completed per week, last ${n} weeks`}>
              {ticks.map(t => (
                <g key={t}>
                  <line x1={M.l} x2={M.l + innerW} y1={y(t)} y2={y(t)} className={t === 0 ? "viz-axis" : "viz-hairline"} />
                  <text x={M.l - 8} y={y(t) + 4} textAnchor="end" className="viz-tick">{t}</text>
                </g>
              ))}
              {bins.map((b, i) => (!everyOther || i % 2 === n % 2 ? (
                <text key={b.start} x={x(i)} y={H - 8} textAnchor="middle" className="viz-tick">{weekLabel(b.start)}</text>
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
