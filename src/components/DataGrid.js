import './DataGrid.css';
import { useState, useRef, useEffect } from 'react';
import ColumnHeader from './ColumnHeader';
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
  // Virtualization/lazy options
  pageChunkSize = 300,
  maxHeight,
  // New controlled props for global behavior
  columnVisibility: controlledColumnVisibility,
  onColumnVisibilityChange,
  columnSizing: controlledColumnSizing,
  onColumnSizingChange,
  // Toggle to opt-in to using the passed controlled visibility/sizing (shared across page)
  useSharedColumnState = false,
  stickyColumnIds = [],
  tableExtraClassName = '',
}) {
  const [internalRowSelection, setInternalRowSelection] = useState({});
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnSizingInfo, setColumnSizingInfo] = useState({});
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [visibleCount, setVisibleCount] = useState(pageChunkSize);
  const defaultVisible = columns.map(col => col.accessorKey ?? col.id).filter(Boolean);
  const [internalVisibleColumns, setInternalVisibleColumns] = useState(controlledColumnVisibility ?? defaultVisible);
  const dropdownRef = useRef(null);
  const scrollRef = useRef(null);

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
    getFilteredRowModel: getFilteredRowModel(),
    // Always use built-in sorted row model; manual sorting disabled for now
    getSortedRowModel: getSortedRowModel(),
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

  // Reset visible rows when data/sorting/filter changes
  useEffect(() => {
    setVisibleCount(pageChunkSize);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [data, pageChunkSize, sorting, globalFilter]);

  // Infinite scroll handler
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // Trigger earlier: when within one viewport height (or at least 600px) from bottom
    const threshold = Math.max(600, el.clientHeight);
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) {
      setVisibleCount((prev) => Math.min(prev + pageChunkSize, table.getRowModel().rows.length));
    }
  };

  // Build the list of rows to render (filtered and sorted by table, then sliced)
  const allRows = table.getRowModel().rows;
  const totalCount = allRows.length;
  const rowsToRender = allRows.slice(0, visibleCount);

  return (
    <div style={{ position: 'relative', maxWidth: '100%', ...style }}>
      {/* Controls aligned to the right edge of the table area (stay fixed while grid scrolls) */}
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
                if (!colKey || colKey === 'select') return null;
                const groupLabel = col.meta?.group;
                return (
                  <div key={colKey} className="form-check mb-1">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`col-toggle-${colKey}`}
                      checked={effectiveVisibleColumns.includes(colKey)}
                      onChange={() => handleToggleColumn(colKey)}
                    />
                    <label className="form-check-label" htmlFor={`col-toggle-${colKey}`} style={{ fontSize: 13 }}>
                      {col.meta?.label ?? (typeof col.header === 'string' ? col.header : colKey)}
                      {groupLabel && <span className="text-muted ms-1" style={{ fontSize: 11 }}>({groupLabel})</span>}
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

      {/* Grid scroll container with sticky header */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{
          overflowY: 'auto',
          overflowX: 'auto',
          maxHeight: maxHeight || undefined,
          maxWidth: '100%',
        }}
      >
        <div className="d-inline-block" style={{ minWidth: '100%' }}>
          <table
            className={`${tableClassName} data-grid-table ${tableExtraClassName}`.trim()}
            style={{
              tableLayout: fixedColumnWidth ? 'fixed' : 'auto',
              width: 'auto',
              maxWidth: '100%',
              marginBottom: 0,
            }}
          >
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} style={headerStyle}>
                  {headerGroup.headers.map((header, headerIdx) => {
                    const canSort = enableSorting && header.column.getCanSort();
                    const sortDir = header.column.getIsSorted();
                    const isResizable = header.column.getCanResize();
                    const colId = header.column.id;
                    const isSticky = stickyColumnIds.includes(colId);
                    let thStyle = { ...headerStyle };
                    if (isSticky) {
                      thStyle.position = 'sticky';
                      thStyle.left = headerIdx === 0 ? 0 : stickyColumnIds.indexOf(colId) === 1 ? 72 : 0;
                      thStyle.zIndex = 5;
                    }
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
                          header.column.columnDef.meta?.label ? (
                            <ColumnHeader
                              label={header.column.columnDef.meta.shortLabel || header.column.columnDef.meta.label}
                              meta={header.column.columnDef.meta}
                              canSort={canSort}
                              sortDir={sortDir}
                              onSort={canSort ? header.column.getToggleSortingHandler() : undefined}
                            />
                          ) : (
                            <div
                              role={canSort ? 'button' : undefined}
                              onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {canSort && (
                                <span style={{ fontSize: 12, opacity: 0.7 }}>
                                  {sortDir === 'asc' ? '↑' : sortDir === 'desc' ? '↓' : '↕'}
                                </span>
                              )}
                            </div>
                          )
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
              {rowsToRender.map((row) => (
                <tr
                  key={row.id}
                  className={row.getIsSelected() ? 'table-active' : undefined}
                  style={{
                    cursor: onRowClick ? 'pointer' : 'default',
                  }}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {row.getVisibleCells().map((cell, cellIdx) => {
                    let cellStyle = {};
                    const colId = cell.column.id;
                    if (stickyColumnIds.includes(colId)) {
                      cellStyle.position = 'sticky';
                      cellStyle.left = cellIdx === 0 ? 0 : stickyColumnIds.indexOf(colId) === 1 ? 72 : 0;
                      cellStyle.zIndex = 2;
                      cellStyle.background = row.getIsSelected() ? undefined : 'inherit';
                    }
                    if (cell.column.columnDef.meta?.numeric) {
                      cellStyle.textAlign = 'right';
                    }
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
                    // Merge cellStyle from column definition if present
                    if (typeof cell.column.columnDef.cellStyle === 'function') {
                      Object.assign(cellStyle, cell.column.columnDef.cellStyle(cell.getContext()));
                    } else if (cell.column.columnDef.cellStyle) {
                      Object.assign(cellStyle, cell.column.columnDef.cellStyle);
                    }
                    return (
                      <td key={cell.id} style={cellStyle} className={cell.column.columnDef.meta?.numeric ? 'numeric-cell' : undefined}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {totalCount > rowsToRender.length && (
            <div className="text-center text-muted py-2" style={{ fontSize: 12 }}>
              Showing {rowsToRender.length} of {totalCount} rows. Scroll to load more…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
