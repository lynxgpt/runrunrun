interface DensityChartProps {
  bins: number[];
  width?: number;
  height?: number;
  axisLabels: string[];
  meanLabel?: string;
  medianLabel?: string;
  meanBin?: number;
  medianBin?: number;
}

export function DensityChart({
  bins,
  width = 360,
  height = 200,
  axisLabels,
  meanLabel,
  medianLabel,
  meanBin,
  medianBin,
}: DensityChartProps) {
  const padL = 20;
  const padR = 20;
  const padT = 20;
  const padB = 32;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const max = Math.max(...bins, 1);
  const n = bins.length;
  const step = innerW / (n - 1);
  const pts = bins.map((v, i) => {
    const x = padL + i * step;
    const y = padT + innerH - (v / max) * innerH;
    return [x, y] as const;
  });
  const area = `M${pts[0][0]},${padT + innerH} ` + pts.map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + ` L${pts[pts.length - 1][0]},${padT + innerH} Z`;
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <path d={area} fill="var(--chart-area)" />
      <path d={line} stroke="var(--chart-line)" strokeWidth={1} fill="none" />
      {typeof meanBin === "number" ? (
        <g>
          <line x1={padL + meanBin * step} x2={padL + meanBin * step} y1={padT} y2={padT + innerH} stroke="var(--chart-line)" strokeDasharray="3 3" strokeWidth={0.8} />
          {meanLabel ? (
            <text x={padL + meanBin * step + 4} y={padT + 10} className="fill-neutral-300 font-tamzen-sm" fontSize={9}>{meanLabel}</text>
          ) : null}
        </g>
      ) : null}
      {typeof medianBin === "number" ? (
        <g>
          <line x1={padL + medianBin * step} x2={padL + medianBin * step} y1={padT} y2={padT + innerH} stroke="#a3a3a3" strokeDasharray="2 4" strokeWidth={0.8} />
          {medianLabel ? (
            <text x={padL + medianBin * step + 4} y={padT + 22} className="fill-neutral-400 font-tamzen-sm" fontSize={9}>{medianLabel}</text>
          ) : null}
        </g>
      ) : null}
      {axisLabels.map((lb, i) => {
        const x = padL + (i / (axisLabels.length - 1)) * innerW;
        return (
          <text key={lb} x={x} y={padT + innerH + 14} textAnchor="middle" className="fill-neutral-500 font-tamzen-sm" fontSize={9}>
            {lb}
          </text>
        );
      })}
    </svg>
  );
}
