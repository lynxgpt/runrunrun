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
  const cy = height / 2 + 6;
  const max = Math.max(...data, ...(ticks ?? []), 1);
  const maxArc = TAU * 0.75;
  const startAngle = -Math.PI / 2;
  const ringGap = 11.5;
  const stroke = 7.5;
  const innerRadius = 22;
  const palette = ["#8ca3ad", "#95a8ad", "#a1aca8", "#adb09f", "#bbb58f", "#c9bd93", "#d0c69d"];

  const rings = data.map((value, i) => ({
    value,
    label: labels[i],
    radius: innerRadius + i * ringGap,
    color: palette[i % palette.length],
    arc: Math.max(0.025, (value / max) * maxArc),
  }));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible">
      <defs>
        <filter id="dailyArcGlow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2.1" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0.58 0 0 0 0  0 0.55 0 0 0.03  0 0 0.47 0 0.06  0 0 0 0.48 0"
            result="soft"
          />
          <feMerge>
            <feMergeNode in="soft" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x={cx - 98} y={cy - 92} width="196" height="184" fill="var(--chart-surface)" opacity="0.24" />

      {rings.map((ring) => (
        <circle
          key={`guide-${ring.label}`}
          cx={cx}
          cy={cy}
          r={ring.radius}
          fill="none"
          stroke="var(--chart-grid)"
          strokeWidth="0.65"
          opacity="0.55"
        />
      ))}

      <g filter="url(#dailyArcGlow)">
        {rings.map((ring) => (
          <path
            key={ring.label}
            d={arcPath(cx, cy, ring.radius, startAngle, startAngle + ring.arc)}
            fill="none"
            stroke={ring.color}
            strokeWidth={stroke}
            strokeLinecap="round"
            opacity="0.82"
          />
        ))}
      </g>

      {rings.map((ring) => {
        const end = polar(cx, cy, ring.radius, startAngle + ring.arc);
        return (
          <circle
            key={`end-${ring.label}`}
            cx={end.x}
            cy={end.y}
            r="2.3"
            fill="var(--chart-surface)"
            stroke={ring.color}
            strokeWidth="0.9"
            opacity="0.9"
          />
        );
      })}

      <line
        x1={cx}
        y1={cy - innerRadius - ringGap * 6 - 13}
        x2={cx}
        y2={cy + innerRadius + ringGap * 6 + 13}
        stroke="var(--chart-grid)"
        strokeWidth="0.55"
        opacity="0.58"
        strokeDasharray="2 3"
      />

      {rings.map((ring, i) => {
        const labelX = cx - 34;
        const labelY = cy - ring.radius + 3;
        return (
          <text
            key={`label-${ring.label}`}
            x={labelX}
            y={labelY}
            textAnchor="end"
            className={i === rings.length - 1 ? "fill-neutral-300 font-tamzen-sm" : "fill-neutral-500 font-tamzen-sm"}
            fontSize={8.5}
          >
            {ring.label} {ring.value.toFixed(1)}
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

function arcPath(cx: number, cy: number, radius: number, start: number, end: number) {
  const a = polar(cx, cy, radius, start);
  const b = polar(cx, cy, radius, end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M${a.x.toFixed(2)},${a.y.toFixed(2)} A${radius},${radius} 0 ${large} 1 ${b.x.toFixed(2)},${b.y.toFixed(2)}`;
}
