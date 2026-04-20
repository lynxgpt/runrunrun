interface PolarClockProps {
  data: number[]; // length 24, index = hour of day
}

// 24-hour polar histogram: each hour is an individual wedge bar.
// Angle = hour (0 = midnight at top, clockwise). Radius = normalised value.
// Matches the source site's "clock face" style with discrete radial bars.

function wedgePath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngle: number, // radians
  endAngle: number,
): string {
  const cos = Math.cos;
  const sin = Math.sin;
  // Shrink slightly for inter-bar gap
  const mid = (startAngle + endAngle) / 2;
  const halfSpan = (endAngle - startAngle) / 2 * 0.88;
  const a0 = mid - halfSpan;
  const a1 = mid + halfSpan;

  const x0o = cx + rOuter * cos(a0), y0o = cy + rOuter * sin(a0);
  const x1o = cx + rOuter * cos(a1), y1o = cy + rOuter * sin(a1);
  const x1i = cx + rInner * cos(a1), y1i = cy + rInner * sin(a1);
  const x0i = cx + rInner * cos(a0), y0i = cy + rInner * sin(a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;

  return [
    `M${x0o.toFixed(2)},${y0o.toFixed(2)}`,
    `A${rOuter.toFixed(2)},${rOuter.toFixed(2)} 0 ${large} 1 ${x1o.toFixed(2)},${y1o.toFixed(2)}`,
    `L${x1i.toFixed(2)},${y1i.toFixed(2)}`,
    `A${rInner.toFixed(2)},${rInner.toFixed(2)} 0 ${large} 0 ${x0i.toFixed(2)},${y0i.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export function PolarClock({ data }: PolarClockProps) {
  const width = 300;
  const height = 300;
  const cx = width / 2;
  const cy = height / 2;
  const rMax = Math.min(width, height) / 2 - 28;
  const rMin = rMax * 0.18; // inner dead-zone radius
  const max = Math.max(...data, 1);

  const cardinals = [
    { h: 0,  label: "12am" },
    { h: 6,  label: "6am" },
    { h: 12, label: "12pm" },
    { h: 18, label: "6pm" },
  ];

  const intermediates = [
    { h: 3,  label: "3am" },
    { h: 9,  label: "9am" },
    { h: 15, label: "3pm" },
    { h: 21, label: "9pm" },
  ];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Reference rings at 33%, 66%, 100% */}
      {[0.33, 0.66, 1.0].map((t) => (
        <circle
          key={t}
          cx={cx} cy={cy}
          r={rMin + (rMax - rMin) * t}
          fill="none"
          stroke="#222"
          strokeWidth={0.5}
        />
      ))}

      {/* Inner dead-zone */}
      <circle cx={cx} cy={cy} r={rMin} fill="#111" />

      {/* 24 wedge bars */}
      {data.map((v, i) => {
        const startAngle = (i / 24) * Math.PI * 2 - Math.PI / 2;
        const endAngle   = ((i + 1) / 24) * Math.PI * 2 - Math.PI / 2;
        const ratio = v / max;
        const rOuter = rMin + (rMax - rMin) * ratio;
        if (rOuter <= rMin + 0.5) return null;

        // Brightness: dim at 0, full at max
        const lightness = Math.round(25 + ratio * 70);

        return (
          <path
            key={i}
            d={wedgePath(cx, cy, rMin, rOuter, startAngle, endAngle)}
            fill={`oklch(${lightness}% 0 0)`}
          />
        );
      })}

      {/* Cardinal tick marks */}
      {cardinals.map(({ h }) => {
        const angle = (h / 24) * Math.PI * 2 - Math.PI / 2;
        const x1 = cx + Math.cos(angle) * (rMax + 2);
        const y1 = cy + Math.sin(angle) * (rMax + 2);
        const x2 = cx + Math.cos(angle) * (rMax + 8);
        const y2 = cy + Math.sin(angle) * (rMax + 8);
        return <line key={h} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#444" strokeWidth={1} />;
      })}

      {/* Cardinal labels */}
      {cardinals.map(({ h, label }) => {
        const angle = (h / 24) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * (rMax + 18);
        const y = cy + Math.sin(angle) * (rMax + 18);
        return (
          <text
            key={h} x={x} y={y + 3}
            textAnchor="middle"
            className="fill-neutral-400 font-tamzen-sm"
            fontSize={9}
          >
            {label}
          </text>
        );
      })}

      {/* Intermediate labels (smaller, muted) */}
      {intermediates.map(({ h, label }) => {
        const angle = (h / 24) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * (rMax + 18);
        const y = cy + Math.sin(angle) * (rMax + 18);
        return (
          <text
            key={h} x={x} y={y + 3}
            textAnchor="middle"
            className="fill-neutral-600 font-tamzen-sm"
            fontSize={8}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
