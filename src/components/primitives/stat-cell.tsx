import { cn } from "@/lib/utils";

interface StatCellProps {
  value: React.ReactNode;
  label: string;
  size?: "sm" | "md" | "lg";
  inline?: boolean;
  className?: string;
}

export function StatCell({ value, label, size = "md", inline, className }: StatCellProps) {
  const valueSize =
    size === "lg" ? "text-5xl" : size === "md" ? "text-3xl" : "text-xl";
  return (
    <div
      className={cn(
        inline
          ? "inline-flex items-baseline gap-2"
          : "flex flex-col items-center",
        className,
      )}
    >
      <span className={cn("font-sans font-bold tracking-tight text-neutral-100", valueSize)}>
        {value}
      </span>
      <span className="font-mono-tamzen text-xs uppercase tracking-wide text-neutral-400">
        {label}
      </span>
    </div>
  );
}
