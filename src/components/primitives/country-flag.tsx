interface CountryFlagProps {
  code?: string;
  className?: string;
}

export function CountryFlag({ code, className = "" }: CountryFlagProps) {
  if (!code || code === "??") return null;
  if (code.toUpperCase() === "AQ") {
    return <span aria-hidden className={className}>{"\u2744\uFE0F"}</span>;
  }

  return <span aria-hidden className={`fi fi-${code.toLowerCase()} ${className}`.trim()} />;
}
