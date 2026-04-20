interface RadarChartProps {
  data: number[]; // length = labels.length
  labels: string[];
  width?: number;
  height?: number;
  ticks?: number[];
}

export function RadarChart({ data, labels, width = 300, height = 300, ticks }: RadarChartProps) {
  const cx = width / 2;
  const cy = height / 2;
  const rMax = Math.min(width, height) / 2 - 32;
  const max = Math.max(...data, ...(ticks ?? []));
  const rings = ticks ?? [max * 0.33, max * 0.66, max];

  const points = data.map((v, i) => {
    const angle = (i / data.length) * Math.PI * 2 - Math.PI / 2;
    const r = (v / max) * rMax;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r] as const;
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {rings.map((t, i) => {
        const r = (t / max) * rMax;
        const polyPts = Array.from({ length: data.length }, (_, j) => {
          const a = (j / data.length) * Math.PI * 2 - Math.PI / 2;
          return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
        }).join(" ");
        return <polygon key={i} points={polyPts} fill="none" stroke="#222" strokeWidth={0.5} />;
      })}
      {rings.map((t, i) => (
        <text
          key={`r${i}`}
          x={cx + 4}
          y={cy - (t / max) * rMax - 2}
          className="fill-neutral-500 font-tamzen-sm"
          fontSize={9}
        >
          {t.toFixed(0)}mi
        </text>
      ))}
      {labels.map((lb, i) => {
        const a = (i / labels.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * (rMax + 16);
        const y = cy + Math.sin(a) * (rMax + 16);
        return (
          <text key={lb} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-neutral-400 font-tamzen-sm" fontSize={9}>
            {lb}
          </text>
        );
      })}
      <path d={path} fill="#ededed" opacity={0.9} />
    </svg>
  );
}
