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
  const cy = height / 2 + 3;
  const max = Math.max(...data, ...(ticks ?? []), 1);
  const innerR = 37;
  const outerR = Math.min(width, height) / 2 - 35;
  const activeR = outerR - innerR;
  const rings = ticks ?? [max * 0.33, max * 0.66, max];
  const palette = ["#9fb0b6", "#b8b09b", "#c9bd93", "#8b7b58", "#171a24"];
  const barAngle = TAU / labels.length * 0.34;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible">
      <defs>
        <filter id="dailyNeedleGlow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0.62 0 0 0 0  0 0.58 0 0 0.02  0 0 0.48 0 0.05  0 0 0 0.48 0"
            result="soft"
          />
          <feMerge>
            <feMergeNode in="soft" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x={cx - outerR - 16} y={cy - outerR - 16} width={(outerR + 16) * 2} height={(outerR + 16) * 2} fill="#050505" opacity="0.28" />

      {rings.map((tick, i) => {
        const r = innerR + (tick / max) * activeR;
        return (
          <circle
            key={tick}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={i === rings.length - 1 ? "#4a4a43" : "#30302c"}
            strokeWidth={i === rings.length - 1 ? 0.95 : 0.65}
            opacity={0.58 + i * 0.1}
          />
        );
      })}

      {labels.map((label, i) => {
        const angle = (i / labels.length) * TAU - Math.PI / 2;
        const end = polar(cx, cy, outerR + 7, angle);
        return (
          <line
            key={`axis-${label}`}
            x1={cx}
            y1={cy}
            x2={end.x}
            y2={end.y}
            stroke="#30302c"
            strokeWidth="0.7"
            opacity="0.72"
          />
        );
      })}

      <circle cx={cx} cy={cy} r={innerR - 7} fill="#050505" stroke="#34342f" strokeWidth="0.8" />

      <g filter="url(#dailyNeedleGlow)">
        {data.map((value, i) => {
          const angle = (i / data.length) * TAU - Math.PI / 2;
          const r = innerR + (value / max) * activeR;
          const d = wedgePath(cx, cy, innerR, r, angle - barAngle / 2, angle + barAngle / 2);
          const color = palette[Math.min(i, palette.length - 1)] ?? "#c9bd93";
          return (
            <path
              key={`bar-${labels[i]}`}
              d={d}
              fill={color}
              opacity={0.72 + (value / max) * 0.22}
              stroke="#d6d0b5"
              strokeWidth="0.28"
            />
          );
        })}
      </g>

      {rings.map((tick, i) => (
        <text
          key={`tick-${i}`}
          x={cx + 5}
          y={cy - (innerR + (tick / max) * activeR) - 3}
          className="fill-neutral-500 font-tamzen-sm"
          fontSize={9}
        >
          {tick.toFixed(0)}
        </text>
      ))}

      {labels.map((label, i) => {
        const angle = (i / labels.length) * TAU - Math.PI / 2;
        const p = polar(cx, cy, outerR + 23, angle);
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

function wedgePath(cx: number, cy: number, inner: number, outer: number, start: number, end: number) {
  const a = polar(cx, cy, outer, start);
  const b = polar(cx, cy, outer, end);
  const c = polar(cx, cy, inner, end);
  const d = polar(cx, cy, inner, start);
  return [
    `M${a.x.toFixed(2)},${a.y.toFixed(2)}`,
    `A${outer},${outer} 0 0 1 ${b.x.toFixed(2)},${b.y.toFixed(2)}`,
    `L${c.x.toFixed(2)},${c.y.toFixed(2)}`,
    `A${inner},${inner} 0 0 0 ${d.x.toFixed(2)},${d.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}
