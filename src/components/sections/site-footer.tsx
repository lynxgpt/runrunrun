import { siteContent } from "@/lib/content";
import { Heart } from "lucide-react";

// 16x11 pixel icon: a Siamese cat riding a subway car (lit amber windows)
const SUBWAY_CAT = [
  "...b..b.........",
  "...bccb.........",
  "...ebbe.........",
  "....bb.....b....",
  "..cccccc..b.....",
  "..ccccccbb......",
  "tttttttttttttt..",
  "twwtwwtwwtwwtt..",
  "twwtwwtwwtwwtt..",
  "tttttttttttttt..",
  ".kk.......kk....",
];
const SUBWAY_CAT_COLORS: Record<string, string> = {
  b: "#5a3a24",
  c: "#f0deb8",
  e: "#4fb4ff",
  t: "#b8bec6",
  w: "#ffb000",
  k: "#3a3a3a",
};

function SubwayCatIcon() {
  return (
    <svg viewBox="0 0 16 11" width={16} height={11} shapeRendering="crispEdges" aria-hidden="true">
      {SUBWAY_CAT.flatMap((row, y) =>
        [...row].map((ch, x) =>
          SUBWAY_CAT_COLORS[ch] ? (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={SUBWAY_CAT_COLORS[ch]} />
          ) : null,
        ),
      )}
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="text-center mt-16 text-xs font-mono-tamzen text-neutral-500 space-y-1">
      <p className="inline-flex items-center justify-center gap-1.5">
        <span>Made with</span>
        <Heart aria-label="love" className="h-3 w-3 text-neutral-400" strokeWidth={1.8} />
        <span>by Claude</span>
      </p>
      <p className="flex items-center justify-center gap-1.5">
        <span>My other Claude projects:</span>
        <a
          href="https://lynxgpt.github.io/subway_time/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 underline hover:text-neutral-300"
        >
          <SubwayCatIcon />
          subway time
        </a>
      </p>
      {siteContent.footer.map((line, i) =>
        line.url ? (
          <p key={i}>
            {line.linkText ? (
              <>
                {line.text}
                <a
                  href={line.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-neutral-300"
                >
                  {line.linkText}
                </a>
              </>
            ) : (
              <a
                href={line.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-neutral-300"
              >
                {line.text}
              </a>
            )}
          </p>
        ) : (
          <p key={i}>{line.text}</p>
        ),
      )}
    </footer>
  );
}
