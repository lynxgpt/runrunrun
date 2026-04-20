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
      {caption ? (
        <p className="mt-1 max-w-xs text-xs italic text-neutral-500 font-mono-tamzen">
          {caption}
        </p>
      ) : null}
      <div className="mt-4 w-full flex justify-center">{children}</div>
    </div>
  );
}
