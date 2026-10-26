"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { DataTable } from "@/components/primitives/data-table";
import { CountryFlag } from "@/components/primitives/country-flag";
import type { GeoRow } from "@/types/activity";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  setGeoFilter,
  toggleCity,
  toggleCountry,
  toggleState,
  useGeoFilter,
} from "@/lib/geo-filter";

// State / province codes → local flag image path.
// Uses regional/cultural flags: Cascadia Republic for WA, Bear Flag for CA.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const STATE_FLAG_IMG: Record<string, string> = {
  WA: `${basePath}/images/flag-wa-cascadia.svg`,
  CA: `${basePath}/images/flag-ca.svg`,
  WY: `${basePath}/images/flag-wy.svg`,
  "British Columbia": `${basePath}/images/flag-bc.svg`,
};

type Kind = "country" | "state" | "city";
export type GeographyRow = GeoRow & { level: 0 | 1 | 2; kind: Kind };
type UnifiedRow = GeographyRow;

interface GeographyViewProps {
  rows: GeographyRow[];
  // Shown only when some runs could not be placed.
  unknownNote: string | null;
}

// Client half of Where I Ran; rows are built at build time by geography.tsx.
export function GeographyView({ rows: allRows, unknownNote }: GeographyViewProps) {
  const filter = useGeoFilter();
  // Child rows (US → states, New York → boroughs) start collapsed; clicking
  // a parent opens it. Keyed by kind:code.
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  if (allRows.length === 0) return null;

  const keyOf = (r: UnifiedRow) => `${r.kind}:${r.code}`;
  // Children follow their parent directly, one level deeper.
  const hasChildren = (r: UnifiedRow) => allRows[allRows.indexOf(r) + 1]?.level === r.level + 1;
  const anyExpandable = allRows.some((r) => r.level === 0 && hasChildren(r));

  // A row shows when every ancestor above it is open.
  const rows: UnifiedRow[] = [];
  const openAt: boolean[] = [true];
  for (const r of allRows) {
    if (!openAt.slice(0, r.level + 1).every(Boolean)) continue;
    rows.push(r);
    openAt[r.level + 1] = open.has(keyOf(r));
    openAt.length = r.level + 2;
  }

  const activeIdx = rows.findIndex((r) => {
    if (filter.kind === "country" && r.kind === "country") return r.code === filter.code;
    if (filter.kind === "state" && r.kind === "state") return r.code === filter.code;
    if (filter.kind === "city" && r.kind === "city") return r.code === filter.code;
    return false;
  });

  const columns = [
    {
      key: "name",
      header: "COUNTRY",
      cell: (r: UnifiedRow) => (
        <span
          className="inline-flex items-center gap-2"
          style={{ paddingLeft: r.level * 20 }}
        >
          {hasChildren(r) ? (
            <ChevronRight
              aria-hidden
              size={14}
              className={cn(
                "shrink-0 text-neutral-500 transition-transform",
                open.has(keyOf(r)) && "rotate-90",
              )}
            />
          ) : r.level === 0 && anyExpandable ? (
            // Keeps every country's flag in the same column.
            <span aria-hidden className="w-3.5 shrink-0" />
          ) : null}
          {r.level === 0 ? (
            <CountryFlag code={r.code} className="text-base leading-none shrink-0" />
          ) : r.level === 1 && r.code && STATE_FLAG_IMG[r.code] ? (
            // State with a flag image (Cascadia/WA, Bear Flag/CA, …)
            // eslint-disable-next-line @next/next/no-img-element
            <img src={STATE_FLAG_IMG[r.code]} alt="" aria-hidden className="h-3.5 w-auto opacity-80 inline-block" />
          ) : hasChildren(r) ? null : (
            // An expandable state row already shows its arrow in this slot.
            <span aria-hidden className="text-neutral-600">└</span>
          )}
          <span className={r.level === 0 ? "" : "text-neutral-400"}>{r.name}</span>
        </span>
      ),
    },
    {
      key: "days",
      header: "DAYS",
      align: "right" as const,
      cell: (r: UnifiedRow) => formatNumber(r.days),
    },
    {
      key: "km",
      header: "↓KM",
      align: "right" as const,
      cell: (r: UnifiedRow) => formatNumber(r.km, 1),
    },
  ];

  const onRowClick = (row: UnifiedRow) => {
    if (hasChildren(row)) {
      // Opening a parent filters to it; closing it clears the filter.
      const key = keyOf(row);
      const opening = !open.has(key);
      setOpen((prev) => {
        const next = new Set(prev);
        if (opening) next.add(key);
        else next.delete(key);
        return next;
      });
      if (!opening) setGeoFilter({ kind: "none" });
      else if (row.kind === "country") setGeoFilter({ kind: "country", code: row.code ?? "??", name: row.name });
      else setGeoFilter({ kind: "state", code: row.code ?? "", name: row.name });
      return;
    }
    if (row.kind === "country") toggleCountry(row.code ?? "??", row.name);
    else if (row.kind === "state") toggleState(row.code ?? "", row.name);
    else toggleCity(row.code ?? "", row.name);
  };

  return (
    <section>
      <div className="mb-8">
        <h2 className="text-center font-sans text-xl font-medium uppercase tracking-wide text-neutral-100 mb-1">
          WHERE I RAN
        </h2>
        <div className="mx-auto max-w-3xl">
          <DataTable
            rows={rows}
            columns={columns}
            highlightedIndex={activeIdx}
            onRowClick={onRowClick}
          />
        </div>
        {unknownNote ? (
          <p className="mx-auto max-w-3xl mt-3 text-xs font-mono-tamzen text-neutral-500 leading-relaxed">
            {unknownNote}
          </p>
        ) : null}
      </div>
    </section>
  );
}
