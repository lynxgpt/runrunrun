import { siteContent } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="text-center mt-16 text-xs font-mono-tamzen text-neutral-500 space-y-1">
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
