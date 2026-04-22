import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  caption?: string;
  className?: string;
  children: React.ReactNode;
}

export function ChartCard({ title, caption, className, children }: ChartCardProps) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <h3 className="font-sans text-lg font-bold uppercase tracking-wide text-neutral-100">
        {title}
      </h3>
      <p
        className="mt-1 max-w-xs text-xs italic text-neutral-500 font-mono-tamzen invisible"
        aria-hidden="true"
      >
        {caption ?? "\u00A0"}
      </p>
      <div className="mt-4 flex h-[220px] w-full items-center justify-center">{children}</div>
    </div>
  );
}
