import './DataGrid.css';
import { useState, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';

export default function DataGrid({
  data,
  columns,
  getRowId = (row) => String(row.id ?? row.ticker ?? row.key ?? Math.random()),
  enableRowSelection = true,
  enableMultiRowSelection = true,
  enableSorting = true,
  enableGlobalFilter = true,
  tableClassName = 'table table-sm table-bordered',
  style,
  onRowClick,
  rowSelection: controlledRowSelection,
  onRowSelectionChange,
  fixedColumnWidth = false,
  // New controlled props for global behavior
  columnVisibility: controlledColumnVisibility,
  onColumnVisibilityChange,
  columnSizing: controlledColumnSizing,
  onColumnSizingChange,
  // Toggle to opt-in to using the passed controlled visibility/sizing (shared across page)
  useSharedColumnState = false,
}) {
  const [internalRowSelection, setInternalRowSelection] = useState({});
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnSizing, setColumnSizing] = useState({});
  const [columnSizingInfo, setColumnSizingInfo] = useState({});
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const defaultVisible = columns.map(col => col.accessorKey ?? col.id).filter(Boolean);
  const [internalVisibleColumns, setInternalVisibleColumns] = useState(controlledColumnVisibility ?? defaultVisible);
  const dropdownRef = useRef(null);

  const rowSelection = controlledRowSelection ?? internalRowSelection;
  const handleRowSelectionChange = onRowSelectionChange ?? setInternalRowSelection;

  // Controlled vs internal states
  const effectiveVisibleColumns = (useSharedColumnState && controlledColumnVisibility) ? controlledColumnVisibility : internalVisibleColumns;

  // Column sizing controlled vs internal
  const [internalColumnSizing, setInternalColumnSizing] = useState(controlledColumnSizing ?? {});
  const effectiveColumnSizing = (useSharedColumnState && controlledColumnSizing) ? controlledColumnSizing : internalColumnSizing;
  const handleColumnSizingChange = (useSharedColumnState && onColumnSizingChange) ? onColumnSizingChange : setInternalColumnSizing;

  // Filter columns based on visible columns
  const filteredColumns = columns.filter(col => (col.accessorKey ?? col.id) ? effectiveVisibleColumns.includes(col.accessorKey ?? col.id) : true);

  const table = useReactTable({
    data,
    columns: filteredColumns,
    state: { rowSelection, sorting, globalFilter, columnSizing: effectiveColumnSizing, columnSizingInfo },
    getRowId,
    enableRowSelection,
    enableMultiRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: handleRowSelectionChange,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnSizingChange: handleColumnSizingChange,
    onColumnSizingInfoChange: setColumnSizingInfo,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  const headerStyle = { background: 'rgba(99, 99, 99, 1)', color: '#fff' };

  // Dropdown for column visibility
  const handleToggleColumn = (colKey) => {
    const updater = (prev) => (
      prev.includes(colKey)
        ? prev.filter((k) => k !== colKey)
        : [...prev, colKey]
    );
    if (useSharedColumnState && onColumnVisibilityChange) {
      onColumnVisibilityChange(updater(effectiveVisibleColumns));
    } else {
      setInternalVisibleColumns((prev) => updater(prev));
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!showColumnDropdown) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowColumnDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showColumnDropdown]);

  return (
    <div style={{ position: 'relative', maxWidth: '100%', ...style }}>
      {/* Scroll container wraps controls and table so controls align with table width */}
      <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
        <div className="d-inline-block" style={{ minWidth: '100%' }}>
          {/* Controls aligned to the right edge of the table area */}
          <div className="d-flex justify-content-end align-items-center mb-2" style={{ gap: '0.5rem' }}>
        <div className="position-relative">
          <button
            type="button"
            className="btn btn-light btn-sm border"
            style={{ padding: '2px 8px', borderRadius: 4 }}
            onClick={() => setShowColumnDropdown((v) => !v)}
            title="Show/hide columns"
          >
            <span style={{ fontSize: 18, verticalAlign: 'middle' }}>☰</span>
          </button>
          {showColumnDropdown && (
            <div
              ref={dropdownRef}
              className="position-absolute bg-white border rounded shadow-sm"
              style={{ right: 0, top: '110%', minWidth: 180, zIndex: 10, padding: 8 }}
            >
              <div className="fw-bold mb-2">Columns</div>
              {columns.map(col => {
                const colKey = col.accessorKey ?? col.id;
                if (!colKey) return null;
                return (
                  <div key={colKey} className="form-check mb-1">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`col-toggle-${colKey}`}
                          checked={effectiveVisibleColumns.includes(colKey)}
                      onChange={() => handleToggleColumn(colKey)}
                    />
                    <label className="form-check-label" htmlFor={`col-toggle-${colKey}`} style={{ fontSize: 14 }}>
                      {col.header || colKey}
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {enableGlobalFilter && (
          <input
            className="form-control form-control-sm"
            style={{ maxWidth: 220 }}
            placeholder="Filter..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        )}
          </div>
          <table
          className={tableClassName}
          style={{
            tableLayout: fixedColumnWidth ? 'fixed' : 'auto',
            width: 'auto',
            maxWidth: '100%',
          }}
        >
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} style={headerStyle}>
              {headerGroup.headers.map(header => {
                const canSort = enableSorting && header.column.getCanSort();
                const sortDir = header.column.getIsSorted();
                const isResizable = header.column.getCanResize();
                let thStyle = { ...headerStyle };
                // Always position relative for proper resizer anchor
                if (isResizable) {
                  thStyle.position = 'relative';
                }
                // Prefer dynamic column sizing when available
                const colSize = table.getState().columnSizing?.[header.column.id];
                if (colSize) {
                  thStyle.width = colSize;
                  thStyle.maxWidth = colSize;
                } else if (fixedColumnWidth) {
                  const colDef = header.column.columnDef;
                  if (colDef.size) {
                    thStyle.width = colDef.size;
                    thStyle.maxWidth = colDef.size;
                  }
                }
                return (
                  <th
                    key={header.id}
                    style={thStyle}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        role={canSort ? 'button' : undefined}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        // title={canSort ? 'Click to sort' : undefined}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span style={{ fontSize: 12, opacity: 0.7 }}>
                            {sortDir === 'asc' ? <>&uarr;</> : sortDir === 'desc' ? <>&darr;</> : <>&#8597;</>}
                          </span>
                        )}
                      </div>
                    )}
                    {isResizable && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          height: '100%',
                          width: 6,
                          cursor: 'col-resize',
                          userSelect: 'none',
                          zIndex: 1,
                        }}
                        title="Drag to resize column"
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={row.getIsSelected() ? 'table-active' : undefined}
              style={{
                cursor: onRowClick ? 'pointer' : 'default',
              }}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {row.getVisibleCells().map(cell => {
                let cellStyle = {};
                // Prefer dynamic column sizing when available
                const cSize = table.getState().columnSizing?.[cell.column.id];
                if (cSize) {
                  cellStyle.width = cSize;
                  cellStyle.maxWidth = cSize;
                } else if (fixedColumnWidth) {
                  const colDef = cell.column.columnDef;
                  if (colDef.size) {
                    cellStyle.width = colDef.size;
                    cellStyle.maxWidth = colDef.size;
                  }
                }
                // Ensure wrapping for fixed layouts
                if (fixedColumnWidth) {
                  cellStyle.whiteSpace = 'normal';
                  cellStyle.wordBreak = 'break-word';
                }
                return (
                  <td key={cell.id} style={cellStyle}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
