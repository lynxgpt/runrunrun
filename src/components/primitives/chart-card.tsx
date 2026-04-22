import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  caption?: string;
  showCaption?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function ChartCard({ title, caption, showCaption = false, className, children }: ChartCardProps) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <h3 className="font-sans text-lg font-bold uppercase tracking-wide text-neutral-100">
        {title}
      </h3>
      <p
        className={cn(
          "mt-1 h-8 max-w-xs text-xs italic leading-4 text-neutral-500 font-mono-tamzen",
          !showCaption && "invisible",
        )}
        aria-hidden={!showCaption}
      >
        {caption ?? "\u00A0"}
      </p>
      <div className="mt-2 flex h-[220px] w-full items-start justify-center">{children}</div>
    </div>
  );
}
