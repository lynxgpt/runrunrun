import type { DistanceFrequencyPoint } from "@/types/activity";

interface DistanceFlowChartProps {
  data: DistanceFrequencyPoint[];
  width?: number;
  height?: number;
}

export function DistanceFlowChart({
  data,
  width = 360,
  height = 220,
}: DistanceFlowChartProps) {
  const padL = 36;
  const padR = 14;
  const padT = 22;
  const padB = 38;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const xMax = Math.max(...data.map((d) => d.km), 10);
  const shapedData = data.map((d) => ({
    ...d,
    displayFrequency: Math.pow(d.frequency, 0.72),
  }));
  const yMax = Math.max(...shapedData.map((d) => d.displayFrequency), 1);
  const xTicks = niceDistanceTicks(xMax);
  const yTicks = [0.25, 0.5, 0.75, 1];

  const points = shapedData.map((d) => ({
    x: padL + (d.km / xMax) * innerW,
    y: padT + innerH - (d.displayFrequency / yMax) * innerH,
    km: d.km,
    frequency: d.displayFrequency,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${padL + innerW},${padT + innerH} L${padL},${padT + innerH} Z`;
  const peak = points.reduce((best, p) => (p.frequency > best.frequency ? p : best), points[0]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible">
      <defs>
        <linearGradient id="distanceFlowFill" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9fb0b6" stopOpacity="0.32" />
          <stop offset="44%" stopColor="#c9bd93" stopOpacity="0.48" />
          <stop offset="76%" stopColor="#8b7b58" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#171a24" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id="distanceFlowStroke" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9fb0b6" />
          <stop offset="48%" stopColor="#d0c69d" />
          <stop offset="100%" stopColor="#5f5a49" />
        </linearGradient>
        <filter id="distanceFlowGlow" x="-10%" y="-35%" width="120%" height="170%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0.58 0 0 0 0  0 0.54 0 0 0.03  0 0 0.48 0 0.06  0 0 0 0.48 0"
            result="soft"
          />
          <feMerge>
            <feMergeNode in="soft" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x={padL} y={padT} width={innerW} height={innerH} fill="var(--chart-surface)" opacity="0.24" />

      {yTicks.map((tick) => {
        const y = padT + innerH - tick * innerH;
        return (
          <line
            key={tick}
            x1={padL}
            x2={padL + innerW}
            y1={y}
            y2={y}
            stroke="var(--chart-grid)"
            strokeWidth="0.65"
            opacity="0.7"
          />
        );
      })}

      {xTicks.map((tick) => {
        const x = padL + (tick / xMax) * innerW;
        return (
          <g key={tick}>
            <line
              x1={x}
              x2={x}
              y1={padT}
              y2={padT + innerH}
              stroke="var(--chart-grid-soft)"
              strokeWidth="0.55"
              opacity="0.7"
            />
            <text
              x={x}
              y={height - padB + 15}
              textAnchor="middle"
              className="fill-neutral-500 font-tamzen-sm"
              fontSize={9}
            >
              {tick}
            </text>
          </g>
        );
      })}

      <g opacity="0.24">
        {Array.from({ length: 10 }, (_, i) => (
          <line
            key={i}
            x1={padL + i * 31}
            y1={padT + innerH}
            x2={padL + 42 + i * 31}
            y2={padT}
            stroke="#f1e6bd"
            strokeWidth="0.55"
          />
        ))}
      </g>

      <g filter="url(#distanceFlowGlow)">
        <path d={areaPath} fill="url(#distanceFlowFill)" />
        <path d={linePath} fill="none" stroke="url(#distanceFlowStroke)" strokeWidth="2.2" strokeLinejoin="round" />
      </g>

      {peak ? (
        <g>
          <line
            x1={peak.x}
            x2={peak.x}
            y1={peak.y}
            y2={padT + innerH}
            stroke="#d0c69d"
            strokeWidth="0.9"
            opacity="0.7"
            strokeDasharray="2 3"
          />
          <rect
            x={peak.x - 3}
            y={peak.y - 3}
            width="6"
            height="6"
            fill="var(--chart-surface)"
            stroke="#d0c69d"
            strokeWidth="1"
            transform={`rotate(45 ${peak.x.toFixed(1)} ${peak.y.toFixed(1)})`}
          />
        </g>
      ) : null}

      <text
        x={padL + innerW / 2}
        y={height - 5}
        textAnchor="middle"
        className="fill-neutral-500 font-tamzen-sm"
        fontSize={9}
      >
        distance
      </text>
      <text
        x={12}
        y={padT + innerH / 2}
        textAnchor="middle"
        transform={`rotate(-90, 12, ${padT + innerH / 2})`}
        className="fill-neutral-500 font-sans"
        fontSize={10}
      >
        frequency
      </text>
    </svg>
  );
}

function niceDistanceTicks(max: number) {
  if (max <= 20) return [0, 5, 10, 15, 20].filter((tick) => tick <= max);
  if (max <= 35) return [0, 5, 10, 15, 20, 25, 30, 35].filter((tick) => tick <= max);
  return [0, 10, 20, 30, 40, 50].filter((tick) => tick <= max);
}
