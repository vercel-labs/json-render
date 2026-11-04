"use client";

import type { SlackBlock } from "@chat-adapter/slack/blocks";

type TextObject = { type: "mrkdwn" | "plain_text"; text: string };
type AnyBlock = SlackBlock & Record<string, any>;

// Chart palette from Slack's data_visualization block, in series order.
const PALETTE = {
  light: [
    "rgb(233, 104, 37)",
    "rgb(32, 162, 113)",
    "rgb(196, 116, 211)",
    "rgb(14, 157, 211)",
    "rgb(239, 62, 117)",
    "rgb(72, 100, 210)",
    "rgb(200, 70, 0)",
    "rgb(14, 103, 77)",
    "rgb(97, 31, 105)",
    "rgb(0, 113, 164)",
    "rgb(158, 11, 46)",
    "rgb(40, 64, 169)",
  ],
  dark: [
    "rgb(213, 106, 55)",
    "rgb(37, 155, 105)",
    "rgb(178, 110, 195)",
    "rgb(22, 153, 202)",
    "rgb(217, 76, 117)",
    "rgb(77, 101, 197)",
    "rgb(228, 160, 127)",
    "rgb(141, 210, 181)",
    "rgb(216, 186, 225)",
    "rgb(88, 189, 222)",
    "rgb(230, 167, 186)",
    "rgb(137, 155, 220)",
  ],
};

const escape = (s: string) =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );

// Slack mrkdwn to HTML. Input is escaped first, so only these tags can appear.
function mrkdwn(text: string) {
  return escape(text)
    .replace(/```([\s\S]*?)```/g, (_, c) => `<pre>${c}</pre>`)
    .replace(
      /&lt;(https?:[^|&]+)\|([^&]+)&gt;/g,
      '<a href="$1" target="_blank" rel="noreferrer">$2</a>',
    )
    .replace(
      /&lt;(https?:[^&]+)&gt;/g,
      '<a href="$1" target="_blank" rel="noreferrer">$1</a>',
    )
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/(^|\W)\*([^*\n]+)\*/g, "$1<b>$2</b>")
    .replace(/(^|\W)_([^_\n]+)_/g, "$1<i>$2</i>")
    .replace(/~([^~\n]+)~/g, "<s>$1</s>")
    .replace(/\n/g, "<br>");
}

function Text({
  value,
  className,
}: {
  value?: TextObject;
  className?: string;
}) {
  if (!value) return null;
  if (value.type === "plain_text")
    return <span className={className}>{value.text}</span>;
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: mrkdwn(value.text) }}
    />
  );
}

// Axis ticks: about six intervals, steps of 1, 2, 2.5, 3 or 5 per decade.
function niceTicks(min: number, max: number) {
  const lo0 = Math.min(0, min);
  const raw = (max - lo0 || 1) / 6;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 3, 5, 10]
    .map((m) => m * mag)
    .find((v) => v >= raw - 1e-9)!;
  const out: number[] = [];
  for (
    let v = Math.floor(lo0 / step) * step;
    v <= Math.ceil(max / step) * step + step / 1e6;
    v += step
  )
    out.push(+v.toFixed(6));
  return out;
}
const formatTick = (v: number) =>
  Math.abs(v) >= 10000
    ? `${+(v / 1000).toFixed(1)}K`
    : v.toLocaleString("en-US");

// Monotone cubic interpolation in x, so lines never overshoot their points.
function monotonePath(pts: [number, number][]) {
  const n = pts.length;
  if (n < 3) return `M${pts.map((p) => p.join(",")).join("L")}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1]![0] - pts[i]![0];
    m[i] = (pts[i + 1]![1] - pts[i]![1]) / dx[i]!;
  }
  const t: number[] = [m[0]!];
  for (let i = 1; i < n - 1; i++)
    t[i] =
      m[i - 1]! * m[i]! <= 0
        ? 0
        : (3 * (dx[i - 1]! + dx[i]!)) /
          ((2 * dx[i]! + dx[i - 1]!) / m[i - 1]! +
            (dx[i]! + 2 * dx[i - 1]!) / m[i]!);
  t[n - 1] = m[n - 2]!;
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i]! / 3;
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[i + 1]!;
    d += `C${x0 + h},${y0 + h * t[i]!} ${x1 - h},${y1 - h * t[i + 1]!} ${x1},${y1}`;
  }
  return d;
}

let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(text: string) {
  if (typeof document === "undefined") return text.length * 7;
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * 7;
  measureCtx.font = "13px Lato, sans-serif";
  return measureCtx.measureText(text).width;
}

function Legend({
  names,
  colors,
  pie,
}: {
  names: string[];
  colors: string[];
  pie?: boolean;
}) {
  return (
    <div className={`sk-legend${pie ? " pie" : ""}`}>
      {names.map((name, i) => (
        <span key={`${name}-${i}`}>
          <i style={{ background: colors[i % colors.length] }} />
          {name}
        </span>
      ))}
    </div>
  );
}

// Geometry follows the Builder: a 428x360 plot, values start at x=74.
function Chart({ block, colors }: { block: AnyBlock; colors: string[] }) {
  const chart = block.chart ?? {};
  const color = (i: number) => colors[i % colors.length]!;

  if (chart.type === "pie") {
    const segments: { label: string; value: number }[] =
      chart.segments ?? chart.data ?? [];
    const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
    const cx = 214;
    const cy = 180;
    const r = 144;
    let a0 = -Math.PI / 2;
    return (
      <div className="sk-chart">
        <h3>{block.title}</h3>
        <div>
          <svg viewBox="0 0 428 360">
            {segments.map((s, i) => {
              const a1 = a0 + (s.value / total) * Math.PI * 2;
              const large = a1 - a0 > Math.PI ? 1 : 0;
              const d = `M${cx},${cy}L${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)}A${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)}Z`;
              a0 = a1;
              return segments.length === 1 ? (
                <circle key={i} cx={cx} cy={cy} r={r} fill={color(i)} />
              ) : (
                <path
                  key={i}
                  d={d}
                  fill={color(i)}
                  stroke="var(--sk-bg)"
                  strokeWidth={2}
                />
              );
            })}
          </svg>
          <Legend names={segments.map((s) => s.label)} colors={colors} pie />
        </div>
      </div>
    );
  }

  const categories: string[] = chart.axis_config?.categories ?? [];
  const series: { name: string; data: { value: number }[] }[] =
    chart.series ?? [];
  const values = series.flatMap((s) => s.data.map((d) => d.value));
  const ticks = niceTicks(Math.min(0, ...values), Math.max(1, ...values));
  const lo = ticks[0]!;
  const hi = ticks.at(-1)!;
  const W = 428;
  const T = 8;
  const B = 334;
  const L = 74;
  const y = (v: number) => B - ((v - lo) / (hi - lo)) * (B - T);
  const isBar = chart.type === "bar";
  // Bars use a band scale over the full width. Lines end early so the last label fits.
  const R = isBar
    ? W
    : W - Math.max(8, textWidth(categories.at(-1) ?? "") / 2 + 3);
  const band = (R - L) / Math.max(1, categories.length);
  const x = (i: number) =>
    isBar
      ? L + band * (i + 0.5)
      : categories.length > 1
        ? L + ((R - L) * i) / (categories.length - 1)
        : (L + R) / 2;
  const barWidth = (band * 0.69) / Math.max(1, series.length);
  const base = y(Math.max(lo, 0));
  const ax = chart.axis_config ?? {};

  return (
    <div className="sk-chart">
      <h3>{block.title}</h3>
      <div>
        <div className="sk-plot">
          {ax.y_label && (
            <div className="sk-ylabel">
              <span>{ax.y_label}</span>
            </div>
          )}
          <svg viewBox={`0 0 ${W} 360`}>
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={L}
                  x2={R}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--sk-grid)"
                  strokeWidth={1}
                />
                <text x={L - 8} y={y(t) + 4.5} textAnchor="end">
                  {formatTick(t)}
                </text>
              </g>
            ))}
            {categories.map((c, i) => (
              <text key={`${c}-${i}`} x={x(i)} y={B + 22} textAnchor="middle">
                {c}
              </text>
            ))}
            {series.map((s, si) => {
              const pts = s.data.map(
                (d, i) => [x(i), y(d.value)] as [number, number],
              );
              if (isBar)
                return s.data.map((d, i) => {
                  const x0 =
                    x(i) - (barWidth * series.length) / 2 + barWidth * si;
                  const top = Math.min(y(d.value), y(0));
                  const h = Math.abs(y(0) - y(d.value));
                  const w = barWidth - (series.length > 1 ? 2 : 0);
                  const r = Math.min(4, h, w / 2);
                  return (
                    <path
                      key={`${si}-${i}`}
                      d={`M${x0},${top + h}L${x0},${top + r}A${r} ${r} 0 0 1 ${x0 + r},${top}L${x0 + w - r},${top}A${r} ${r} 0 0 1 ${x0 + w},${top + r}L${x0 + w},${top + h}Z`}
                      fill={color(si)}
                    />
                  );
                });
              const d = monotonePath(pts);
              return (
                <g key={si}>
                  {chart.type === "area" && (
                    <path
                      d={`${d}L${pts.at(-1)![0]},${base}L${pts[0]![0]},${base}Z`}
                      fill={color(si)}
                      fillOpacity={0.3}
                    />
                  )}
                  <path d={d} fill="none" stroke={color(si)} strokeWidth={2} />
                </g>
              );
            })}
          </svg>
        </div>
        {ax.x_label && <div className="sk-xlabel">{ax.x_label}</div>}
        <Legend names={series.map((s) => s.name)} colors={colors} />
      </div>
    </div>
  );
}

function Table({ block }: { block: AnyBlock }) {
  const [head = [], ...rows]: { text?: string }[][] = block.rows ?? [];
  return (
    <div className="sk-table">
      <div className="sk-table-head">
        <strong>{block.caption ?? "Table"}</strong>
      </div>
      <div className="sk-table-box">
        <div
          className="sk-grid"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, head.length)}, minmax(96px, 1fr))`,
          }}
        >
          {head.map((cell, i) => (
            <div key={i} className="h">
              {cell.text}
            </div>
          ))}
          <div className="sk-body">
            {rows.flatMap((row, ri) =>
              row.map((cell, ci) => (
                <div key={`${ri}-${ci}`} className={ri ? "top" : undefined}>
                  {cell.text}
                </div>
              )),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({ block, colors }: { block: AnyBlock; colors: string[] }) {
  switch (block.type) {
    case "header":
      return (
        <div className="sk-header">
          <Text value={block.text} />
        </div>
      );
    case "context":
      return (
        <div className="sk-context sk-mrkdwn">
          {(block.elements ?? []).map((e: TextObject, i: number) => (
            <Text key={i} value={e} />
          ))}
        </div>
      );
    case "section":
      return (
        <div className="sk-section sk-mrkdwn">
          {block.text && (
            <div>
              <Text value={block.text} />
            </div>
          )}
          {block.fields && (
            <div className="sk-fields">
              {block.fields.map((f: TextObject, i: number) => (
                <div key={i}>
                  <Text value={f} />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    case "divider":
      return <div className="sk-divider" />;
    case "image":
      // eslint-disable-next-line @next/next/no-img-element
      return (
        <div className="sk-image">
          <img src={block.image_url} alt={block.alt_text} />
        </div>
      );
    case "actions":
      return (
        <div className="sk-actions">
          {(block.elements ?? []).map((e: AnyBlock, i: number) => (
            <span key={i} className={`sk-btn ${e.style ?? ""}`}>
              {e.text?.text}
            </span>
          ))}
        </div>
      );
    case "data_visualization":
      return <Chart block={block} colors={colors} />;
    case "data_table":
      return <Table block={block} />;
    default:
      return <pre className="sk-raw">{JSON.stringify(block, null, 2)}</pre>;
  }
}

export function SlackPreview({
  blocks,
  theme,
}: {
  blocks: SlackBlock[];
  theme: "light" | "dark";
}) {
  const colors = PALETTE[theme];
  return (
    <div className="sk-card">
      <div className="sk-msg">
        <div className="sk-avatar">J</div>
        <div>
          <div className="sk-meta">
            <span className="sk-name">json-render</span>
            <span className="sk-badge">APP</span>
            <span className="sk-ts">now</span>
          </div>
          <div>
            {blocks.map((b, i) => (
              <div key={i} className="sk-block">
                <Block block={b as AnyBlock} colors={colors} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
