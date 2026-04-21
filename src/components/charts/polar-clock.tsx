interface PolarClockProps {
  data: number[]; // length 24, index = hour of day
}

interface PolarPoint {
  angle: number;
  inner: number;
  outer: number;
  value: number;
}

const TAU = Math.PI * 2;

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function closedPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";

  return points
    .map((point, index) => {
      const previous = points[(index - 1 + points.length) % points.length];
      const next = points[(index + 1) % points.length];
      const startControl = {
        x: point.x - (next.x - previous.x) / 6,
        y: point.y - (next.y - previous.y) / 6,
      };
      const endControl = {
        x: point.x + (next.x - previous.x) / 6,
        y: point.y + (next.y - previous.y) / 6,
      };

      if (index === 0) return `M${point.x.toFixed(2)},${point.y.toFixed(2)}`;
      return `C${startControl.x.toFixed(2)},${startControl.y.toFixed(2)} ${endControl.x.toFixed(2)},${endControl.y.toFixed(2)} ${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    })
    .join(" ") + " Z";
}

function annulusPath(cx: number, cy: number, points: PolarPoint[]) {
  const outer = points.map((point) => polarToCartesian(cx, cy, point.outer, point.angle));
  const inner = [...points]
    .reverse()
    .map((point) => polarToCartesian(cx, cy, point.inner, point.angle));

  return closedPath([...outer, ...inner]);
}

function scaleField(points: PolarPoint[], outerScale: number, innerOffset = 0) {
  return points.map((point) => {
    const span = point.outer - point.inner;
    return {
      ...point,
      inner: point.inner + innerOffset,
      outer: point.inner + span * outerScale,
    };
  });
}

function hourValue(data: number[], hour: number) {
  const h = ((hour % 24) + 24) % 24;
  const base = Math.floor(h);
  const next = (base + 1) % 24;
  const t = h - base;
  const a = data[base] ?? 0;
  const b = data[next] ?? 0;
  return a + (b - a) * t;
}

function roughness(index: number) {
  return (
    Math.sin(index * 1.91) * 0.55 +
    Math.sin(index * 4.37 + 1.4) * 0.32 +
    Math.sin(index * 9.83 + 0.7) * 0.13
  );
}

function buildDivergenceField(data: number[]) {
  const samples = 144;
  const max = Math.max(...data, 1);
  const baseRadius = 74;

  return Array.from({ length: samples }, (_, index): PolarPoint => {
    const hour = (index / samples) * 24;
    const angle = (hour / 24) * TAU - Math.PI / 2;
    const smoothed =
      hourValue(data, hour - 0.8) * 0.18 +
      hourValue(data, hour - 0.35) * 0.26 +
      hourValue(data, hour) * 0.32 +
      hourValue(data, hour + 0.35) * 0.18 +
      hourValue(data, hour + 0.8) * 0.06;
    const strength = Math.max(0, Math.min(1, smoothed / max));
    const noise = roughness(index);
    const flare = Math.pow(strength, 1.28);

    return {
      angle,
      value: smoothed,
      inner: baseRadius - 5 - flare * 6 + noise * 0.6,
      outer: baseRadius + 8 + flare * 60 + noise * (1.4 + flare * 4),
    };
  });
}

function radialLine(cx: number, cy: number, hour: number, inner: number, outer: number) {
  const angle = (hour / 24) * TAU - Math.PI / 2;
  const a = polarToCartesian(cx, cy, inner, angle);
  const b = polarToCartesian(cx, cy, outer, angle);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}

function labelPosition(cx: number, cy: number, hour: number, radius: number) {
  const angle = (hour / 24) * TAU - Math.PI / 2;
  return polarToCartesian(cx, cy, radius, angle);
}

export function PolarClock({ data }: PolarClockProps) {
  const width = 340;
  const height = 340;
  const cx = width / 2;
  const cy = height / 2;
  const gridRadius = 138;
  const field = buildDivergenceField(data);
  const max = Math.max(...data, 1);
  const peakHour = data.reduce((best, value, hour) => (value > data[best] ? hour : best), 0);
  const peakLabel = `${String(peakHour).padStart(2, "0")}:00`;

  const ringRadii = [42, 58, 74, 90, 106, 122, 138];
  const labels = [
    { h: 0, label: "12am" },
    { h: 3, label: "3am" },
    { h: 6, label: "6am" },
    { h: 9, label: "9am" },
    { h: 12, label: "12pm" },
    { h: 15, label: "3pm" },
    { h: 18, label: "6pm" },
    { h: 21, label: "9pm" },
  ];

  return (
    <figure className="w-full max-w-[360px]">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible">
        <defs>
          <filter id="polarClockSoftBloom" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 0.92 0 0 0.05  0 0 0.84 0 0.1  0 0 0 0.72 0"
              result="soft"
            />
            <feMerge>
              <feMergeNode in="soft" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="polarClockCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#050505" />
            <stop offset="58%" stopColor="#050505" />
            <stop offset="100%" stopColor="#111" />
          </radialGradient>
          <linearGradient id="polarClockField" x1="20%" y1="15%" x2="85%" y2="88%">
            <stop offset="0%" stopColor="#72f7ff" stopOpacity="0.78" />
            <stop offset="48%" stopColor="#f7fbff" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#ff9f45" stopOpacity="0.86" />
          </linearGradient>
          <linearGradient id="polarClockHeat" x1="25%" y1="10%" x2="80%" y2="90%">
            <stop offset="0%" stopColor="#5ee7ff" stopOpacity="0.34" />
            <stop offset="52%" stopColor="#ffffff" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#ff6d2d" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        <rect width={width} height={height} fill="transparent" />

        {ringRadii.map((radius, index) => (
          <circle
            key={radius}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={index === 2 ? "#2f2f2f" : "#202020"}
            strokeWidth={index === 2 ? 1.1 : 0.75}
          />
        ))}

        {Array.from({ length: 24 }, (_, hour) => {
          const line = radialLine(cx, cy, hour, 34, gridRadius);
          return (
            <line
              key={hour}
              {...line}
              stroke={hour % 6 === 0 ? "#2d2d2d" : "#1b1b1b"}
              strokeWidth={hour % 6 === 0 ? 1 : 0.6}
            />
          );
        })}

        {[5, 10, 15].map((pct, index) => {
          const y = cy - 74 - index * 18;
          return (
            <g key={pct}>
              <rect x={cx - 18} y={y - 11} width="36" height="18" fill="#070707" opacity="0.82" />
              <text
                x={cx}
                y={y + 2}
                textAnchor="middle"
                className="fill-neutral-500 font-mono-tamzen"
                fontSize={12}
              >
                {pct}%
              </text>
            </g>
          );
        })}

        <g
          className="animate-[polar-flame-bloom_2.8s_ease-in-out_infinite]"
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        >
          <path
            d={annulusPath(cx, cy, scaleField(field, 1.22, -2))}
            fill="url(#polarClockHeat)"
            opacity="0.42"
            filter="url(#polarClockSoftBloom)"
          />
          <path
            d={annulusPath(cx, cy, field)}
            fill="url(#polarClockField)"
            opacity="0.94"
          />
          <path
            d={annulusPath(cx, cy, scaleField(field, 0.74, 5))}
            className="animate-[polar-flame-core_2.8s_ease-in-out_infinite]"
            fill="#fff"
            opacity="0.86"
          />
        </g>

        <circle cx={cx} cy={cy} r="60" fill="url(#polarClockCore)" />
        <circle cx={cx} cy={cy} r="72" fill="none" stroke="#ededed" strokeWidth="1.4" opacity="0.72" />
        <circle cx={cx} cy={cy} r="73.8" fill="none" stroke="#fff" strokeWidth="0.55" opacity="0.62" />

        {labels.map(({ h, label }) => {
          const pos = labelPosition(cx, cy, h, h % 6 === 0 ? 55 : 79);
          return (
            <text
              key={h}
              x={pos.x}
              y={pos.y + 4}
              textAnchor="middle"
              className={h % 6 === 0 ? "fill-neutral-500 font-mono-tamzen" : "fill-neutral-600 font-mono-tamzen"}
              fontSize={h % 6 === 0 ? 13 : 12}
            >
              {label}
            </text>
          );
        })}

        <text
          x={cx}
          y={height - 18}
          textAnchor="middle"
          className="fill-neutral-600 font-mono-tamzen"
          fontSize={11}
          letterSpacing={1.4}
        >
          peak {peakLabel} / {max.toFixed(1)}%
        </text>
      </svg>
    </figure>
  );
}
