import { siteContent } from "@/lib/content";

// Foreword copy lives in content/site.yaml under the `foreword` key — an
// array of paragraph strings. Edit that file to update the text without
// touching JSX. This server component reads the parsed content at build time;
// each push rebuilds the static export with the latest text.
//
// Inline `code` spans are supported: wrap text in backticks within a string.
// For richer markup, consider a dedicated markdown key in site.yaml.

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("`") && p.endsWith("`")) {
      return (
        <code key={i} className="mx-1">
          {p.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

export function Foreword() {
  const paragraphs = siteContent.foreword;
  return (
    <section className="text-center mb-16">
      <h2 className="font-sans text-xl font-medium uppercase tracking-wide text-neutral-100 mb-8">
        FOREWORD
      </h2>
      <div className="mx-auto max-w-2xl text-left space-y-4 text-sm leading-6 font-mono-tamzen text-neutral-300">
        {paragraphs.map((p, i) => (
          <p key={i}>{renderInline(p)}</p>
        ))}
      </div>
    </section>
  );
}
