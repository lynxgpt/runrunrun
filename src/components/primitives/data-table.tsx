import { cn } from "@/lib/utils";

interface Column<Row> {
  key: keyof Row | string;
  header: React.ReactNode;
  cell: (row: Row, i: number) => React.ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
}

interface DataTableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  highlightedIndex?: number;
  onRowClick?: (row: Row, i: number) => void;
  className?: string;
}

export function DataTable<Row>({
  columns,
  rows,
  highlightedIndex,
  onRowClick,
  className,
}: DataTableProps<Row>) {
  return (
    <table className={cn("w-full font-mono-tamzen text-sm", className)}>
      <thead>
        <tr className="text-neutral-400 text-xs uppercase tracking-wide">
          {columns.map((c) => (
            <th
              key={String(c.key)}
              className={cn(
                "pb-3 font-normal",
                c.align === "right" && "text-right",
                c.align === "center" && "text-center",
                c.align !== "right" && c.align !== "center" && "text-left",
              )}
              style={c.width ? { width: c.width } : undefined}
            >
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            className={cn(
              "text-neutral-300",
              onRowClick && "cursor-pointer hover:bg-neutral-900",
              i === highlightedIndex && "bg-neutral-800 text-neutral-100",
            )}
            onClick={onRowClick ? () => onRowClick(row, i) : undefined}
          >
            {columns.map((c) => (
              <td
                key={String(c.key)}
                className={cn(
                  "py-2 px-2",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                )}
              >
                {c.cell(row, i)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
