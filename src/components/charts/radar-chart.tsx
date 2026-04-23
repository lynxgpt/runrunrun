interface RadarChartProps {
  data: number[]; // length = labels.length
  labels: string[];
  width?: number;
  height?: number;
  ticks?: number[];
}

const TAU = Math.PI * 2;

export function RadarChart({ data, labels, width = 300, height = 220, ticks }: RadarChartProps) {
  const cx = width / 2;
  const cy = height / 2 + 4;
  const max = Math.max(...data, ...(ticks ?? []), 1);
  const radius = Math.min(width, height) / 2 - 47;
  const band = 21;
  const slot = TAU / labels.length;
  const palette = ["#9fb0b6", "#b8b09b", "#c9bd93", "#8b7b58", "#171a24"];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible">
      <defs>
        <filter id="dailyWidthGlow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2.1" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0.58 0 0 0 0  0 0.55 0 0 0.03  0 0 0.47 0 0.06  0 0 0 0.5 0"
            result="soft"
          />
          <feMerge>
            <feMergeNode in="soft" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x={cx - radius - band - 16} y={cy - radius - band - 16} width={(radius + band + 16) * 2} height={(radius + band + 16) * 2} fill="#050505" opacity="0.28" />

      {[radius - 13, radius, radius + band].map((r, i) => (
        <circle
          key={r}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={i === 1 ? "#474740" : "#2f2f2b"}
          strokeWidth={i === 1 ? 0.9 : 0.65}
          opacity={i === 1 ? 0.72 : 0.55}
        />
      ))}

      {labels.map((label, i) => {
        const angle = i * slot - Math.PI / 2;
        const outer = polar(cx, cy, radius + band + 10, angle);
        const inner = polar(cx, cy, radius - 20, angle);
        return (
          <line
            key={`axis-${label}`}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke="#31312d"
            strokeWidth="0.7"
            opacity="0.68"
          />
        );
      })}

      <g filter="url(#dailyWidthGlow)">
        {data.map((value, i) => {
          const center = i * slot - Math.PI / 2;
          const t = Math.max(0.08, value / max);
          const angleWidth = slot * (0.12 + t * 0.72);
          const color = palette[Math.min(i, palette.length - 1)] ?? "#c9bd93";
          return (
            <path
              key={`arc-${labels[i]}`}
              d={arcBandPath(cx, cy, radius - band * 0.18, radius + band * 0.82, center - angleWidth / 2, center + angleWidth / 2)}
              fill={color}
              opacity={0.64 + t * 0.25}
              stroke="#d5cda8"
              strokeWidth="0.35"
            />
          );
        })}
      </g>

      {data.map((value, i) => {
        const center = i * slot - Math.PI / 2;
        const t = Math.max(0.08, value / max);
        const angleWidth = slot * (0.12 + t * 0.72);
        const edge = polar(cx, cy, radius + band + 4, center + angleWidth / 2);
        const base = polar(cx, cy, radius + band - 5, center + angleWidth / 2);
        return (
          <line
            key={`edge-${labels[i]}`}
            x1={base.x}
            y1={base.y}
            x2={edge.x}
            y2={edge.y}
            stroke="#d5cda8"
            strokeWidth="0.85"
            opacity="0.6"
          />
        );
      })}

      <circle cx={cx} cy={cy} r={radius - 28} fill="#050505" stroke="#34342f" strokeWidth="0.8" />

      {labels.map((label, i) => {
        const p = polar(cx, cy, radius + band + 24, i * slot - Math.PI / 2);
        return (
          <text
            key={label}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-neutral-400 font-tamzen-sm"
            fontSize={9}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function polar(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function arcBandPath(cx: number, cy: number, inner: number, outer: number, start: number, end: number) {
  const a = polar(cx, cy, outer, start);
  const b = polar(cx, cy, outer, end);
  const c = polar(cx, cy, inner, end);
  const d = polar(cx, cy, inner, start);
  const large = end - start > Math.PI ? 1 : 0;
  return [
    `M${a.x.toFixed(2)},${a.y.toFixed(2)}`,
    `A${outer},${outer} 0 ${large} 1 ${b.x.toFixed(2)},${b.y.toFixed(2)}`,
    `L${c.x.toFixed(2)},${c.y.toFixed(2)}`,
    `A${inner},${inner} 0 ${large} 0 ${d.x.toFixed(2)},${d.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}
