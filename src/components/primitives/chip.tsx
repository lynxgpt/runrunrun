"use client";

import { cn } from "@/lib/utils";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Chip({ active, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "px-3 py-1 text-sm font-mono-tamzen transition-colors cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500",
        active
          ? "bg-white text-neutral-900"
          : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
