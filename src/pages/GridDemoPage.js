

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper
} from "@tanstack/react-table";

const initialData = [
  { id: 1, name: "Oli Bob", age: 12, color: "red", dob: "01/01/1980", rating: 5, passed: true },
  { id: 2, name: "Mary May", age: 1, color: "green", dob: "12/05/1989", rating: 4, passed: true },
  { id: 5, name: "Margret Marmajuke", age: 16, color: "yellow", dob: "07/01/1999", rating: 4, passed: false },
  { id: 6, name: "Van Ng", age: 37, color: "green", dob: "06/10/1982", rating: 4, passed: true },
  { id: 7, name: "Duc Ng", age: 37, color: "yellow", dob: "10/10/1982", rating: 4, passed: true }
];

const columnHelper = createColumnHelper();

export default function GridDemoPage() {
  const [data, setData] = useState(initialData);
  const [rowSelection, setRowSelection] = useState({});
  const [selectedName, setSelectedName] = useState("");

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            ref={(el) => el && (el.indeterminate = table.getIsSomePageRowsSelected())}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            disabled={!row.getCanSelect?.()}
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        size: 32
      }),
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => <strong>{info.getValue()}</strong>,
      }),
      columnHelper.accessor("age", {
        header: "Age",
        cell: (info) => {
          const v = info.getValue();
          const pct = Math.max(0, Math.min(100, Number(v)));
          return (
            <div style={{ width: 100 }}>
              <div style={{ height: 8, background: 'var(--bs-secondary-bg)', borderRadius: 4 }}>
                <div style={{ width: `${pct}%`, height: 8, background: 'var(--bs-success)', borderRadius: 4 }} />
              </div>
              <small>{v}</small>
            </div>
          );
        },
      }),
      columnHelper.accessor("color", { header: "Favourite Color" }),
      columnHelper.accessor("dob", { header: "Date Of Birth" }),
      columnHelper.accessor("rating", {
        header: "Rating",
        cell: (info) => {
          const stars = Number(info.getValue()) || 0;
          return <span style={{ color: 'var(--bs-warning)' }}>{"★".repeat(stars)}</span>;
        },
      }),
      columnHelper.accessor("passed", {
        header: "Passed?",
        cell: (info) => info.getValue() ? <span style={{ color: 'var(--bs-success)' }}>✓</span> : <span style={{ color: 'var(--bs-danger)' }}>✗</span>,
      }),
      columnHelper.accessor("custom", {
        header: "Custom",
        cell: ({ row, getValue }) => (
          <input
            value={getValue() ?? ""}
            onChange={(e) => {
              const next = data.map(d => (d.id === row.original.id ? { ...d, custom: e.target.value } : d));
              setData(next);
            }}
            style={{ width: 120 }}
          />
        ),
      }),
    ],
    [data]
  );

  const table = useReactTable({
    data,
    columns,
    state: { rowSelection },
    enableRowSelection: true,
    // Disallow selecting rows where color === 'yellow'
    enableMultiRowSelection: true,
    getRowId: (row) => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    getRowCanSelect: (row) => row.original.color !== "yellow",
  });

  return (
    <div style={{ padding: 16 }}>
      <table className="table table-sm" style={{ width: "100%" }}>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} style={{ verticalAlign: "middle" }}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => {
            const selectable = table.options.getRowCanSelect?.(row) ?? true;
            return (
              <tr
                key={row.id}
                className={row.getIsSelected() ? "table-active" : undefined}
                style={{ cursor: selectable ? "pointer" : "not-allowed" }}
                onClick={() => {
                  if (!selectable) return;
                  row.toggleSelected();
                  setSelectedName(row.original.name);
                }}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <i>
        Selected Name: <strong>{selectedName}</strong>
      </i>
    </div>
  );
}
