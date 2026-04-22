import { siteContent } from "@/lib/content";
import { Heart } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="text-center mt-16 text-xs font-mono-tamzen text-neutral-500 space-y-1">
      <p className="inline-flex items-center justify-center gap-1.5">
        <span>Made with</span>
        <Heart aria-label="love" className="h-3 w-3 text-neutral-400" strokeWidth={1.8} />
        <span>by Claude</span>
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
