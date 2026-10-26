import { countriesVisited, usStatesVisited, nycBoroughsVisited } from "@/lib/mock-data";
import { siteContent } from "@/lib/content";
import { GeographyView, type GeographyRow } from "@/components/sections/geography-view";

// Server half: country → state → borough rows, built at build time.
function buildRows(): GeographyRow[] {
  const out: GeographyRow[] = [];
  for (const c of countriesVisited) {
    out.push({ ...c, level: 0, kind: "country" });
    if (c.code === "US") {
      for (const s of usStatesVisited) {
        out.push({ ...s, level: 1, kind: "state" });
        if (s.code === "NY") {
          for (const b of nycBoroughsVisited) {
            out.push({ ...b, level: 2, kind: "city" });
          }
        }
      }
    }
  }
  return out;
}

export function Geography() {
  const rows = buildRows();
  if (rows.length === 0) return null;
  return (
    <GeographyView
      rows={rows}
      unknownNote={
        countriesVisited.some((r) => r.code === "??") ? siteContent.geography.unknownNote : null
      }
    />
  );
}
