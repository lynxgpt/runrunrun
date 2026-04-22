interface PolarClockProps {
  data: number[]; // length 24, index = hour of day
}

interface PolarPoint {
  angle: number;
  inner: number;
  outer: number;
  value: number;
  strength: number;
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

function segmentPath(cx: number, cy: number, a: PolarPoint, b: PolarPoint) {
  const ao = polarToCartesian(cx, cy, a.outer, a.angle);
  const bo = polarToCartesian(cx, cy, b.outer, b.angle);
  const bi = polarToCartesian(cx, cy, b.inner, b.angle);
  const ai = polarToCartesian(cx, cy, a.inner, a.angle);

  return [
    `M${ao.x.toFixed(2)},${ao.y.toFixed(2)}`,
    `L${bo.x.toFixed(2)},${bo.y.toFixed(2)}`,
    `L${bi.x.toFixed(2)},${bi.y.toFixed(2)}`,
    `L${ai.x.toFixed(2)},${ai.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function pulsePoint(point: PolarPoint, amount = 7) {
  const movement = Math.pow(point.strength, 1.45) * amount;
  if (movement < 0.2) return point;

  return {
    ...point,
    inner: point.inner - movement * 0.12,
    outer: point.outer + movement,
  };
}

function innerPoint(point: PolarPoint) {
  return {
    ...point,
    inner: point.inner + 6,
    outer: point.inner + (point.outer - point.inner) * 0.64,
  };
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
      strength,
      inner: baseRadius - 5 - flare * 6 + noise * 0.6,
      outer: baseRadius + 8 + flare * 60 + noise * (1.4 + flare * 4),
    };
  });
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function mixColor(a: string, b: string, t: number) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const clamped = Math.max(0, Math.min(1, t));
  const channel = (from: number, to: number) => Math.round(from + (to - from) * clamped);
  return `rgb(${channel(ca.r, cb.r)}, ${channel(ca.g, cb.g)}, ${channel(ca.b, cb.b)})`;
}

function timeColor(hour: number) {
  if (hour < 6 || hour >= 21) return "#171a24";
  if (hour < 12) return mixColor("#9fb0b6", "#c9bd93", (hour - 6) / 6);
  if (hour < 18) return mixColor("#c9bd93", "#b59c7a", (hour - 12) / 6);
  return mixColor("#b59c7a", "#171a24", (hour - 18) / 3);
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

        <g filter="url(#polarClockSoftBloom)">
          {field.map((point, index) => {
            const next = field[(index + 1) % field.length];
            const pulse = pulsePoint(point);
            const nextPulse = pulsePoint(next);
            const hour = (index / field.length) * 24;
            return (
              <path
                key={`glow-${index}`}
                d={segmentPath(cx, cy, point, next)}
                fill={timeColor(hour)}
                opacity={0.18 + point.strength * 0.28}
              >
                {point.strength > 0.03 ? (
                  <animate
                    attributeName="d"
                    values={`${segmentPath(cx, cy, point, next)};${segmentPath(cx, cy, pulse, nextPulse)};${segmentPath(cx, cy, point, next)}`}
                    dur="3.4s"
                    repeatCount="indefinite"
                  />
                ) : null}
              </path>
            );
          })}
        </g>

        <g>
          {field.map((point, index) => {
            const next = field[(index + 1) % field.length];
            const pulse = pulsePoint(point, 5);
            const nextPulse = pulsePoint(next, 5);
            const hour = (index / field.length) * 24;
            return (
              <path
                key={`field-${index}`}
                d={segmentPath(cx, cy, point, next)}
                fill={timeColor(hour)}
                opacity={0.78 + point.strength * 0.18}
              >
                {point.strength > 0.03 ? (
                  <animate
                    attributeName="d"
                    values={`${segmentPath(cx, cy, point, next)};${segmentPath(cx, cy, pulse, nextPulse)};${segmentPath(cx, cy, point, next)}`}
                    dur="3.4s"
                    repeatCount="indefinite"
                  />
                ) : null}
              </path>
            );
          })}
        </g>

        <g opacity="0.62">
          {field.map((point, index) => {
            const inner = innerPoint(point);
            const nextInner = innerPoint(field[(index + 1) % field.length]);
            const pulse = innerPoint(pulsePoint(point, 3));
            const nextPulse = innerPoint(pulsePoint(field[(index + 1) % field.length], 3));
            return (
              <path
                key={`core-${index}`}
                d={segmentPath(cx, cy, inner, nextInner)}
                fill="#fff"
                opacity={0.18 + point.strength * 0.55}
              >
                {point.strength > 0.03 ? (
                  <animate
                    attributeName="d"
                    values={`${segmentPath(cx, cy, inner, nextInner)};${segmentPath(cx, cy, pulse, nextPulse)};${segmentPath(cx, cy, inner, nextInner)}`}
                    dur="3.4s"
                    repeatCount="indefinite"
                  />
                ) : null}
              </path>
            );
          })}
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

      </svg>
    </figure>
  );
}
