import './DataGrid.css';
import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, memo } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { readResearchScroll, saveResearchScroll } from '../utils/researchScrollState';
import ColumnHeader from './ColumnHeader';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';

export const DataGridColumnMenu = memo(function DataGridColumnMenu({
  columns,
  effectiveVisibleColumns,
  onToggleColumn,
  onResetColumns,
  onShowAllColumns,
  resetColumnsTitle,
}) {
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);

  const handleResetColumns = () => {
    onResetColumns();
    setColumnMenuOpen(false);
  };

  const handleShowAllColumns = () => {
    onShowAllColumns();
    setColumnMenuOpen(false);
  };

  return (
    <DropdownMenu.Root open={columnMenuOpen} onOpenChange={setColumnMenuOpen} modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="st-btn-ghost data-grid-columns-btn"
          title="Show/hide columns"
          aria-label="Show/hide columns"
        >
          Cols
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="data-grid-column-menu"
          side="bottom"
          align="end"
          sideOffset={4}
          collisionPadding={12}
          avoidCollisions
        >
          <div className="data-grid-column-menu-header">
            <div className="fw-bold">Columns</div>
            <div className="data-grid-column-menu-actions">
              <button
                type="button"
                className="st-link-muted"
                onClick={handleResetColumns}
                title={resetColumnsTitle}
              >
                Reset
              </button>
              <button
                type="button"
                className="st-link-muted"
                onClick={handleShowAllColumns}
                title="Show all columns"
              >
                All
              </button>
            </div>
          </div>
          {columns.map((col) => {
            const colKey = col.accessorKey ?? col.id;
            if (!colKey || colKey === 'select') return null;
            const groupLabel = col.meta?.group;
            return (
              <div key={colKey} className="st-check-row">
                <input
                  className="st-check"
                  type="checkbox"
                  id={`col-toggle-${colKey}`}
                  checked={effectiveVisibleColumns.includes(colKey)}
                  onChange={() => onToggleColumn(colKey)}
                />
                <label className="st-check-label" htmlFor={`col-toggle-${colKey}`}>
                  {col.meta?.label ?? (typeof col.header === 'string' ? col.header : colKey)}
                  {groupLabel && <span className="st-muted-note ms-1">({groupLabel})</span>}
                </label>
              </div>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
});

const DataGridToolbar = memo(function DataGridToolbar({
  columns,
  effectiveVisibleColumns,
  onToggleColumn,
  onResetColumns,
  onShowAllColumns,
  resetColumnsTitle,
  enableGlobalFilter,
  globalFilter,
  onGlobalFilterChange,
  toolbarClassName = 'data-grid-toolbar d-flex justify-content-end align-items-center mb-1',
}) {
  return (
    <div className={toolbarClassName}>
      <DataGridColumnMenu
        columns={columns}
        effectiveVisibleColumns={effectiveVisibleColumns}
        onToggleColumn={onToggleColumn}
        onResetColumns={onResetColumns}
        onShowAllColumns={onShowAllColumns}
        resetColumnsTitle={resetColumnsTitle}
      />
      {enableGlobalFilter && (
        <input
          className="st-input data-grid-filter"
          placeholder="Filter rows…"
          aria-label="Filter table rows"
          value={globalFilter ?? ''}
          onChange={(event) => onGlobalFilterChange(event.target.value)}
        />
      )}
    </div>
  );
});

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
  columnGroups = [],
  tableExtraClassName = '',
  defaultVisibleColumns,
  resetColumnsTitle = 'Reset visible columns to the default set for this view',
  compact = false,
  sorting: controlledSorting,
  onSortingChange,
  manualSorting = false,
  onGroupHeaderToggle,
  scrollPersistenceKey,
  activeRowId,
  showToolbar = true,
}) {
  const defaultColWidth = 150;
  const stickyColumnKey = stickyColumnIds.join(',');
  const stickyIds = useMemo(
    () => (stickyColumnKey ? stickyColumnKey.split(',') : []),
    [stickyColumnKey],
  );
  const [internalRowSelection, setInternalRowSelection] = useState({});
  const [measuredStickyWidths, setMeasuredStickyWidths] = useState({});
  const [internalSorting, setInternalSorting] = useState([]);
  const sorting = controlledSorting ?? internalSorting;
  const handleSortingChange = onSortingChange ?? setInternalSorting;
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnSizingInfo, setColumnSizingInfo] = useState({});
  const [visibleCount, setVisibleCount] = useState(pageChunkSize);
  const allColumnIds = columns.map(col => col.accessorKey ?? col.id).filter(Boolean);
  const defaultVisible = defaultVisibleColumns ?? allColumnIds;
  const [internalVisibleColumns, setInternalVisibleColumns] = useState(
    controlledColumnVisibility ?? defaultVisible.filter((id) => allColumnIds.includes(id)),
  );
  const scrollRef = useRef(null);

  const rowSelection = controlledRowSelection ?? internalRowSelection;
  const handleRowSelectionChange = onRowSelectionChange ?? setInternalRowSelection;

  // Controlled vs internal states
  const effectiveVisibleColumns = (useSharedColumnState && controlledColumnVisibility) ? controlledColumnVisibility : internalVisibleColumns;

  useEffect(() => {
    if (useSharedColumnState && controlledColumnVisibility) {
      setInternalVisibleColumns(controlledColumnVisibility);
    }
  }, [useSharedColumnState, controlledColumnVisibility]);

  // Column sizing controlled vs internal
  const [internalColumnSizing, setInternalColumnSizing] = useState(controlledColumnSizing ?? {});
  const effectiveColumnSizing = (useSharedColumnState && controlledColumnSizing) ? controlledColumnSizing : internalColumnSizing;
  const handleColumnSizingChange = (useSharedColumnState && onColumnSizingChange) ? onColumnSizingChange : setInternalColumnSizing;

  // Filter columns based on visible columns
  const filteredColumns = columns.filter(col => (col.accessorKey ?? col.id) ? effectiveVisibleColumns.includes(col.accessorKey ?? col.id) : true);

  const table = useReactTable({
    data,
    columns: filteredColumns,
    defaultColumn: compact
      ? { minSize: 28 }
      : { size: defaultColWidth, minSize: 40 },
    state: { rowSelection, sorting, globalFilter, columnSizing: effectiveColumnSizing, columnSizingInfo },
    getRowId,
    enableRowSelection: (row) => {
      if (row.original?._isGroupHeader) return false;
      if (typeof enableRowSelection === 'function') return enableRowSelection(row);
      return enableRowSelection;
    },
    enableMultiRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    manualSorting,
    onRowSelectionChange: handleRowSelectionChange,
    onSortingChange: handleSortingChange,
    onGlobalFilterChange: setGlobalFilter,
    onColumnSizingChange: handleColumnSizingChange,
    onColumnSizingInfoChange: setColumnSizingInfo,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  const headerStyle = { background: 'var(--st-grid-header-bg)', color: 'var(--st-grid-header-fg)' };

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

  useEffect(() => {
    if (!scrollPersistenceKey) return undefined;
    return () => {
      if (scrollRef.current) {
        saveResearchScroll(scrollPersistenceKey, scrollRef.current.scrollTop);
      }
    };
  }, [scrollPersistenceKey]);

  useLayoutEffect(() => {
    if (!scrollPersistenceKey || !scrollRef.current) return;
    const saved = readResearchScroll(scrollPersistenceKey);
    if (saved != null) scrollRef.current.scrollTop = saved;
  }, [scrollPersistenceKey, data.length]);

  // Reset visible rows when data/sorting/filter changes
  useEffect(() => {
    setVisibleCount(pageChunkSize);
    if (!scrollPersistenceKey && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [data, pageChunkSize, sorting, globalFilter, scrollPersistenceKey]);

  const rowCountRef = useRef(0);
  rowCountRef.current = table.getRowModel().rows.length;

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = Math.max(600, el.clientHeight);
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) {
      setVisibleCount((prev) => Math.min(prev + pageChunkSize, rowCountRef.current));
    }
  }, [pageChunkSize]);

  // Build the list of rows to render (filtered and sorted by table, then sliced)
  const allRows = table.getRowModel().rows;
  const totalCount = allRows.length;
  const rowsToRender = allRows.slice(0, visibleCount);

  const visibleHeaders = table.getHeaderGroups()[0]?.headers ?? [];
  const visibleColumnsKey = effectiveVisibleColumns.join(',');

  const ungroupedColumnIds = useMemo(() => {
    if (!columnGroups.length) return new Set();
    const grouped = new Set(columnGroups.flatMap((group) => group.columnIds));
    return new Set(
      filteredColumns
        .map((col) => col.accessorKey ?? col.id)
        .filter((id) => id && !grouped.has(id)),
    );
  }, [columnGroups, filteredColumns]);

  const getColumnWidth = (columnId, header) => {
    if (effectiveColumnSizing[columnId]) {
      return effectiveColumnSizing[columnId];
    }
    if (compact) {
      return undefined;
    }
    const colDef = filteredColumns.find((col) => (col.accessorKey ?? col.id) === columnId);
    return header?.getSize?.() ?? colDef?.size ?? defaultColWidth;
  };

  const stickyLeftByColId = useMemo(() => {
    const offsets = {};
    let left = 0;
    stickyIds.forEach((colId) => {
      offsets[colId] = left;
      if (compact) {
        left += measuredStickyWidths[colId] ?? effectiveColumnSizing[colId] ?? 0;
      } else {
        const colDef = filteredColumns.find((col) => (col.accessorKey ?? col.id) === colId);
        left += effectiveColumnSizing[colId] ?? colDef?.size ?? defaultColWidth;
      }
    });
    return offsets;
  }, [stickyIds, filteredColumns, effectiveColumnSizing, defaultColWidth, compact, measuredStickyWidths]);

  const applyWidthStyle = (baseStyle, colId, width) => {
    if (width == null) return baseStyle;
    if (compact) {
      return { ...baseStyle, width };
    }
    return { ...baseStyle, width, minWidth: width, maxWidth: width };
  };

  useLayoutEffect(() => {
    if (!compact || !stickyIds.length) {
      setMeasuredStickyWidths((prev) => (Object.keys(prev).length ? {} : prev));
      return undefined;
    }
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const tableEl = scrollRef.current?.querySelector('table');
      if (!tableEl) return;
      const next = {};
      stickyIds.forEach((colId) => {
        const cell = tableEl.querySelector(`[data-col-id="${colId}"]`);
        if (cell) {
          next[colId] = Math.round(cell.getBoundingClientRect().width);
        }
      });
      setMeasuredStickyWidths((prev) => {
        const unchanged = stickyIds.every((id) => prev[id] === next[id]);
        return unchanged ? prev : next;
      });
    };
    // Measure after layout; avoid ResizeObserver (sticky offset updates can retrigger measure in a loop).
    const frame = window.requestAnimationFrame(measure);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [compact, stickyIds, visibleColumnsKey, sorting, globalFilter, data.length]);

  const stickyStackIndex = (colId) => stickyIds.indexOf(colId);

  const applyStickyStyle = (colId, baseStyle = {}) => {
    const stackIdx = stickyStackIndex(colId);
    if (stackIdx < 0) return baseStyle;
    const stackBoost = baseStyle.zIndex ?? 3;
    return {
      ...baseStyle,
      position: 'sticky',
      left: stickyLeftByColId[colId] ?? 0,
      zIndex: stackBoost + stackIdx,
      background: baseStyle.background ?? 'inherit',
    };
  };

  const resetVisibleColumns = useCallback(() => {
    const next = defaultVisible.filter((id) => allColumnIds.includes(id));
    if (useSharedColumnState && onColumnVisibilityChange) {
      onColumnVisibilityChange(next);
    } else {
      setInternalVisibleColumns(next);
    }
  }, [
    allColumnIds,
    defaultVisible,
    onColumnVisibilityChange,
    useSharedColumnState,
  ]);

  const showAllColumns = useCallback(() => {
    if (useSharedColumnState && onColumnVisibilityChange) {
      onColumnVisibilityChange(allColumnIds);
    } else {
      setInternalVisibleColumns(allColumnIds);
    }
  }, [allColumnIds, onColumnVisibilityChange, useSharedColumnState]);

  return (
    <div style={{ position: 'relative', maxWidth: '100%', ...style }}>
      {showToolbar && (
        <DataGridToolbar
          columns={columns}
          effectiveVisibleColumns={effectiveVisibleColumns}
          onToggleColumn={handleToggleColumn}
          onResetColumns={resetVisibleColumns}
          onShowAllColumns={showAllColumns}
          resetColumnsTitle={resetColumnsTitle}
          enableGlobalFilter={enableGlobalFilter}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
        />
      )}

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
              tableLayout: compact ? 'auto' : 'fixed',
              width: 'max-content',
              minWidth: compact ? undefined : '100%',
              marginBottom: 0,
            }}
          >
            {!compact && (
              <colgroup>
                {visibleHeaders.map((header) => {
                  const width = getColumnWidth(header.column.id, header);
                  return <col key={header.id} style={width ? { width, minWidth: width } : undefined} />;
                })}
              </colgroup>
            )}
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              {columnGroups.length > 0 && (
                <tr style={{ ...headerStyle, background: 'var(--st-grid-group-header-bg)' }}>
                  {(() => {
                    const cells = [];
                    let idx = 0;
                    while (idx < visibleHeaders.length) {
                      const header = visibleHeaders[idx];
                      const colId = header.column.id;
                      const width = getColumnWidth(colId, header);
                      if (ungroupedColumnIds.has(colId)) {
                        cells.push(
                          <th
                            key={`group-${colId}`}
                            rowSpan={2}
                            data-col-id={colId}
                            style={{
                              ...applyWidthStyle(
                                applyStickyStyle(colId, { ...headerStyle, zIndex: 5 }),
                                colId,
                                width,
                              ),
                              verticalAlign: 'middle',
                            }}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </th>,
                        );
                        idx += 1;
                        continue;
                      }
                      const group = columnGroups.find((item) => item.columnIds.includes(colId));
                      if (!group) {
                        idx += 1;
                        continue;
                      }
                      let span = 0;
                      while (idx + span < visibleHeaders.length) {
                        const nextId = visibleHeaders[idx + span].column.id;
                        if (!group.columnIds.includes(nextId)) break;
                        span += 1;
                      }
                      cells.push(
                        <th
                          key={`group-${group.id}-${idx}`}
                          colSpan={span}
                          style={{ ...headerStyle, textAlign: 'center', fontSize: compact ? 11 : 12 }}
                        >
                          {group.label}
                        </th>,
                      );
                      idx += span;
                    }
                    return cells;
                  })()}
                </tr>
              )}
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} style={headerStyle}>
                  {headerGroup.headers
                    .filter((header) => !columnGroups.length || !ungroupedColumnIds.has(header.column.id))
                    .map((header) => {
                    const canSort = enableSorting && header.column.getCanSort();
                    const sortDir = header.column.getIsSorted();
                    const isResizable = header.column.getCanResize();
                    const colId = header.column.id;
                    const width = getColumnWidth(colId, header);
                    let thStyle = applyWidthStyle(
                      applyStickyStyle(colId, {
                        ...headerStyle,
                        zIndex: stickyStackIndex(colId) >= 0 ? 5 : headerStyle.zIndex,
                      }),
                      colId,
                      width,
                    );
                    if (isResizable && !stickyIds.includes(colId)) {
                      thStyle.position = 'relative';
                    }
                    return (
                      <th
                        key={header.id}
                        data-col-id={colId}
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
                              tooltipPlacement="top-start"
                              tooltipFloating
                            />
                          ) : (
                            <div
                              role={canSort ? 'button' : undefined}
                              onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {canSort && (
                                <span className="st-grid-sort-icon">
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
              {rowsToRender.map((row) => {
                if (row.original?._isGroupHeader) {
                  const colSpan = row.getVisibleCells().length;
                  return (
                    <tr
                      key={row.id}
                      className="st-grid-group-row"
                      style={{ cursor: onGroupHeaderToggle ? 'pointer' : 'default' }}
                      onClick={() => onGroupHeaderToggle?.(row.original._groupKey)}
                    >
                      <td colSpan={colSpan} className="st-grid-group-cell">
                        {onGroupHeaderToggle && (
                          <span className="st-grid-group-toggle" aria-hidden="true">
                            {row.original._collapsed ? '▶' : '▼'}
                          </span>
                        )}
                        <strong>{row.original._groupLabel}</strong>
                        {row.original._groupCount != null && (
                          <span className="text-muted ms-2">({row.original._groupCount})</span>
                        )}
                      </td>
                    </tr>
                  );
                }
                const rowId = getRowId(row.original);
                const isActive = row.getIsSelected() || (activeRowId != null && String(activeRowId) === String(rowId));
                return (
                <tr
                  key={row.id}
                  className={isActive ? 'table-active' : undefined}
                  style={{
                    cursor: onRowClick ? 'pointer' : 'default',
                  }}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const colId = cell.column.id;
                    const header = visibleHeaders.find((item) => item.column.id === colId);
                    const width = getColumnWidth(colId, header);
                    let cellStyle = applyWidthStyle(
                      applyStickyStyle(colId, {
                        background: row.getIsSelected() ? undefined : (stickyStackIndex(colId) >= 0 ? 'var(--bs-body-bg)' : undefined),
                        zIndex: stickyStackIndex(colId) >= 0 ? 3 : undefined,
                      }),
                      colId,
                      width,
                    );
                    if (cell.column.columnDef.meta?.numeric) {
                      cellStyle.textAlign = 'right';
                    }
                    if (fixedColumnWidth) {
                      cellStyle.whiteSpace = 'normal';
                      cellStyle.wordBreak = 'break-word';
                    }
                    const precomputedStyle = row.original?._isGroupHeader
                      ? undefined
                      : row.original?._heatStyles?.[colId];
                    if (precomputedStyle) {
                      Object.assign(cellStyle, precomputedStyle);
                    } else if (typeof cell.column.columnDef.cellStyle === 'function') {
                      Object.assign(cellStyle, cell.column.columnDef.cellStyle(cell.getContext()));
                    } else if (cell.column.columnDef.cellStyle) {
                      Object.assign(cellStyle, cell.column.columnDef.cellStyle);
                    }
                    return (
                      <td
                        key={cell.id}
                        data-col-id={colId}
                        style={cellStyle}
                        className={cell.column.columnDef.meta?.numeric ? 'numeric-cell' : undefined}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
                );
              })}
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
