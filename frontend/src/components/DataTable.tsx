import React from "react";

import { cn } from "../lib/utils";

export type Column<T> = {
  key: keyof T;
  header: string;
  render?: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
};

const DataTable = <T extends Record<string, unknown>>({ columns, data, emptyMessage = "Không có dữ liệu" }: DataTableProps<T>) => {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800">
        <thead className="bg-slate-900/80">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-950/40">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-sm text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const rowKey = (row as { id?: string | number }).id ?? index;
              return (
                <tr
                  key={rowKey}
                  className={cn("transition-colors", index % 2 === 0 ? "bg-slate-950/20" : "bg-slate-950/40")}
                >
                  {columns.map((column) => (
                  <td key={String(column.key)} className="px-4 py-3 text-sm text-slate-200">
                    {column.render ? column.render(row) : String(row[column.key] ?? "")}
                  </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
