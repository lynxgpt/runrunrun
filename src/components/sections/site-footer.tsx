import { siteContent } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="text-center mt-16 text-xs font-mono-tamzen text-neutral-500 space-y-1">
      {siteContent.footer.map((line, i) =>
        line.url ? (
          <p key={i}>
            <a
              href={line.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-neutral-300"
            >
              {line.text}
            </a>
          </p>
        ) : (
          <p key={i}>{line.text}</p>
        ),
      )}
    </footer>
  );
}
