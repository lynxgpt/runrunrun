interface BarChartProps {
  data: { label: string; value: number }[];
  width?: number;
  height?: number;
  yTicks?: number[];
  showValues?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export function BarChart({
  data,
  width = 360,
  height = 220,
  yTicks,
  showValues = true,
  xAxisLabel,
  yAxisLabel,
}: BarChartProps) {
  const padL = 40;
  const padR = 10;
  const padT = 20;
  const padB = 40;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const max = Math.max(...data.map((d) => d.value));
  const ticks = yTicks ?? niceTicks(max, 5);
  const yMax = ticks[ticks.length - 1];
  const barW = (innerW / data.length) * 0.7;
  const gap = innerW / data.length - barW;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
      {ticks.map((t, i) => {
        const y = padT + innerH - (t / yMax) * innerH;
        return (
          <g key={i}>
            <line x1={padL} x2={padL + innerW} y1={y} y2={y} stroke="#1f1f1f" strokeWidth={0.5} />
            <text x={padL - 6} y={y + 3} textAnchor="end" className="fill-neutral-500 font-tamzen-sm" fontSize={9}>
              {formatTick(t)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = padL + i * (barW + gap) + gap / 2;
        const h = (d.value / yMax) * innerH;
        const y = padT + innerH - h;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={h} fill="#d4d4d4" />
            {showValues ? (
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                className="fill-neutral-400 font-tamzen-sm"
                fontSize={9}
              >
                {formatTick(d.value)}
              </text>
            ) : null}
            <text
              x={x + barW / 2}
              y={height - padB + 14}
              textAnchor="middle"
              className="fill-neutral-500 font-tamzen-sm"
              fontSize={9}
            >
              {d.label}
            </text>
          </g>
        );
      })}
      {xAxisLabel ? (
        <text x={padL + innerW / 2} y={height - 4} textAnchor="middle" className="fill-neutral-500 font-tamzen-sm" fontSize={9}>
          {xAxisLabel}
        </text>
      ) : null}
      {yAxisLabel ? (
        // Bitmap fonts don't survive rotation cleanly, so use the sans stack
        // for the rotated axis label.
        <text
          x={12}
          y={padT + innerH / 2}
          textAnchor="middle"
          transform={`rotate(-90, 12, ${padT + innerH / 2})`}
          className="fill-neutral-500 font-sans"
          fontSize={10}
        >
          {yAxisLabel}
        </text>
      ) : null}
    </svg>
  );
}

function niceTicks(max: number, count: number): number[] {
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const normalized = max / step;
  const niceStep = normalized <= 2 ? 0.5 : normalized <= 5 ? 1 : 2;
  const stride = niceStep * step;
  const ticks: number[] = [];
  const rounded = Math.ceil(max / stride) * stride;
  for (let i = 0; i <= count; i++) {
    ticks.push(Math.round((rounded / count) * i));
  }
  return ticks;
}

function formatTick(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US");
  return String(n);
}
