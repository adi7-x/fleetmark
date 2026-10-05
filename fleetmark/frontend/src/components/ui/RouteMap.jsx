import React from "react";

/**
 * Static route summary: real stop names along a curved line, with one stop
 * highlighted (the student's). No moving bus — there is no GPS feed, so the
 * map must not pretend to show live position.
 *
 * Props:
 * - stops: ordered stop names (at least 2)
 * - highlight: index of the stop to emphasise
 * - compact: smaller sizing for card embedding
 */
export default function RouteMap({ stops, highlight = 0, compact = false }) {
  if (!stops || stops.length < 2) return null;

  const height = compact ? 150 : 220;
  const width = compact ? 260 : 360;
  const padX = 34;
  const centerY = height / 2;
  const step = (width - padX * 2) / (stops.length - 1);
  const points = stops.map((_, i) => ({ x: padX + step * i, y: centerY }));

  const pathD = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `C ${cx} ${prev.y - 28}, ${cx} ${p.y - 28}, ${p.x} ${p.y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      role="img"
      aria-label={stops.join(" → ")}
      style={{ width: "100%", height: "auto", maxWidth: width }}
    >
      <path d={pathD} stroke="var(--border, #21262d)" strokeWidth="2" strokeDasharray="6 4" fill="none" />
      {points.map((p, i) => {
        const on = i === highlight;
        return (
          <g key={i}>
            {on ? <circle cx={p.x} cy={p.y} r="12" fill="none" stroke="var(--accent, #818cf8)" strokeWidth="1" opacity="0.35" /> : null}
            <circle
              cx={p.x}
              cy={p.y}
              r={on ? 7 : 5}
              fill={on ? "var(--accent, #818cf8)" : "var(--surface3, #212836)"}
              stroke={on ? "var(--accent, #818cf8)" : "var(--border, #21262d)"}
              strokeWidth="2"
            />
            <text
              x={p.x}
              y={p.y + 28}
              textAnchor="middle"
              fill={on ? "var(--text-primary, #e6edf3)" : "var(--text-tertiary, #8b949e)"}
              fontSize={compact ? "9" : "10"}
              fontWeight={on ? "700" : "500"}
              fontFamily="Inter, sans-serif"
            >
              {stops[i].length > 16 ? `${stops[i].slice(0, 15)}…` : stops[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
