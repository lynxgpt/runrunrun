import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  caption?: string;
  showCaption?: boolean;
  fixedChartHeight?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function ChartCard({
  title,
  caption,
  showCaption = false,
  fixedChartHeight = false,
  className,
  children,
}: ChartCardProps) {
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
      <div
        className={cn(
          "mt-2 flex w-full justify-center",
          fixedChartHeight ? "h-[220px] items-start" : "items-center",
        )}
      >
        {children}
      </div>
    </div>
  );
}
