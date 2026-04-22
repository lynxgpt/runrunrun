"use client";

import type { MonthlyMileage } from "@/types/activity";
import { toggleMonth, useGeoFilter } from "@/lib/geo-filter";

interface MonthlyDistanceChartProps {
  data: MonthlyMileage[];
  width?: number;
  height?: number;
}

const SEASON_COLORS = {
  winter: "#48505a",
  spring: "#4d554b",
  summer: "#5b4d4c",
  fall: "#5b5348",
};

export function MonthlyDistanceChart({
  data,
  width = 380,
  height = 220,
}: MonthlyDistanceChartProps) {
  const filter = useGeoFilter();
  const padL = 38;
  const padR = 10;
  const padT = 24;
  const padB = 38;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const max = Math.max(...data.map((d) => d.km), 1);
  const ticks = niceTicks(max, 4);
  const yMax = ticks[ticks.length - 1] || 1;
  const slot = innerW / Math.max(data.length, 1);
  const barW = Math.max(5, slot * 0.62);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible">
      {ticks.map((tick) => {
        const y = padT + innerH - (tick / yMax) * innerH;
        return (
          <g key={tick}>
            <line x1={padL} x2={padL + innerW} y1={y} y2={y} stroke="#242424" strokeWidth={0.65} />
            <text x={padL - 6} y={y + 3} textAnchor="end" className="fill-neutral-500 font-tamzen-sm" fontSize={9}>
              {tick}
            </text>
          </g>
        );
      })}

      {data.map((month, index) => {
        const x = padL + index * slot + (slot - barW) / 2;
        const h = (month.km / yMax) * innerH;
        const y = padT + innerH - h;
        const shouldLabel = index === 0 || month.monthIndex === 0 || month.monthIndex % 3 === 0;
        const active = filter.kind === "month" && filter.code === month.month;

        return (
          <g
            key={month.month}
            role="button"
            tabIndex={0}
            aria-pressed={active}
            aria-label={`Filter to ${month.label}, ${month.km} kilometers`}
            className="cursor-pointer outline-none"
            onClick={() => toggleMonth(month.month, month.label)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleMonth(month.month, month.label);
              }
            }}
          >
            <rect
              x={x - (slot - barW) / 2}
              y={padT}
              width={slot}
              height={innerH}
              fill="transparent"
            />
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={1.5}
              fill={seasonColor(month.monthIndex)}
              fillOpacity={active ? 0.95 : 0.62}
              stroke={active ? "#d6d6d6" : "transparent"}
              strokeWidth={active ? 0.9 : 0}
            />
            {month.marker ? (
              <MilestoneStar
                cx={x + barW / 2}
                cy={Math.max(11, y - 8)}
                kind={month.marker}
              />
            ) : null}
            {shouldLabel ? (
              <text
                x={x + barW / 2}
                y={height - padB + 14}
                textAnchor="middle"
                className="fill-neutral-500 font-tamzen-sm"
                fontSize={9}
              >
                {month.label}
              </text>
            ) : null}
          </g>
        );
      })}

      <text
        x={12}
        y={padT + innerH / 2}
        textAnchor="middle"
        transform={`rotate(-90, 12, ${padT + innerH / 2})`}
        className="fill-neutral-500 font-sans"
        fontSize={10}
      >
        km
      </text>
    </svg>
  );
}

function seasonColor(monthIndex: number) {
  const anchors = [
    { month: 0, color: SEASON_COLORS.winter },
    { month: 1, color: SEASON_COLORS.winter },
    { month: 3, color: SEASON_COLORS.spring },
    { month: 6, color: SEASON_COLORS.summer },
    { month: 9, color: SEASON_COLORS.fall },
    { month: 11, color: SEASON_COLORS.winter },
  ];
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (monthIndex >= a.month && monthIndex <= b.month) {
      return mix(a.color, b.color, (monthIndex - a.month) / (b.month - a.month || 1));
    }
  }
  return SEASON_COLORS.winter;
}

function MilestoneStar({ cx, cy, kind }: { cx: number; cy: number; kind: "half-star" | "star" }) {
  const points = starPoints(cx, cy, 7, 3.2);
  const clipId = `half-star-${cx.toFixed(1)}-${cy.toFixed(1)}`.replaceAll(".", "-");

  if (kind === "star") {
    return <polygon points={points} fill="#d8d2bd" stroke="#f0ead8" strokeWidth={0.8} />;
  }

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={cx - 7} y={cy - 8} width={7} height={16} />
        </clipPath>
      </defs>
      <polygon points={points} fill="none" stroke="#b7b1a0" strokeWidth={0.8} opacity={0.85} />
      <polygon points={points} fill="#d8d2bd" clipPath={`url(#${clipId})`} />
    </g>
  );
}

function starPoints(cx: number, cy: number, outer: number, inner: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? outer : inner;
    return `${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`;
  }).join(" ");
}

function mix(a: string, b: string, t: number) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const clamped = Math.max(0, Math.min(1, t));
  const channel = (from: number, to: number) => Math.round(from + (to - from) * clamped);
  return `rgb(${channel(ca.r, cb.r)}, ${channel(ca.g, cb.g)}, ${channel(ca.b, cb.b)})`;
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function niceTicks(max: number, count: number): number[] {
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const normalized = max / step;
  const niceStep = normalized <= 2 ? 0.5 : normalized <= 5 ? 1 : 2;
  const stride = niceStep * step;
  const rounded = Math.ceil(max / stride) * stride;
  return Array.from({ length: count + 1 }, (_, i) => Math.round((rounded / count) * i));
}
