interface HorizontalBarsProps {
  data: { label: string; sub?: string; value: number }[];
  unit?: string;
  width?: number;
  height?: number;
}

export function HorizontalBars({ data, unit, width = 360, height = 200 }: HorizontalBarsProps) {
  const padL = 110;
  const padR = 40;
  const padT = 10;
  const padB = 10;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const rowH = innerH / data.length;
  const max = Math.max(...data.map((d) => d.value));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {data.map((d, i) => {
        const y = padT + i * rowH + rowH * 0.2;
        const bh = rowH * 0.6;
        const w = (d.value / max) * innerW;
        return (
          <g key={d.label}>
            <text x={padL - 6} y={y + bh * 0.7} textAnchor="end" className="fill-neutral-300 font-tamzen-sm" fontSize={9}>
              <tspan>{d.label}</tspan>
              {d.sub ? <tspan dx={6} className="fill-neutral-500">{d.sub}</tspan> : null}
            </text>
            <rect x={padL} y={y} width={w} height={bh} fill="#d4d4d4" />
            <text x={padL + w + 4} y={y + bh * 0.7} className="fill-neutral-400 font-tamzen-sm" fontSize={9}>
              {d.value.toLocaleString("en-US")}{unit ?? ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
