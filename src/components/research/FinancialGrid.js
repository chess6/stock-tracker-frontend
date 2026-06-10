import './FinancialGrid.css';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';

const DEFAULT_ROW_HEIGHT = 28;
const COMPACT_ROW_HEIGHT = 22;
const GROUP_ROW_HEIGHT = 24;
const COMPACT_GROUP_ROW_HEIGHT = 20;

export default function FinancialGrid({
  data = [],
  columns = [],
  columnGroups = [],
  stickyColumnIds = [],
  getRowId = (row) => String(row.id ?? row.key ?? Math.random()),
  rowHeight,
  maxHeight = 'calc(100vh - 220px)',
  scrollMode = 'panel',
  enableKeyboardNav = true,
  compact = false,
}) {
  const scrollRef = useRef(null);
  const pageScroll = scrollMode === 'page';
  const [focusedCell, setFocusedCell] = useState(null);
  const [measuredStickyWidths, setMeasuredStickyWidths] = useState({});
  const effectiveRowHeight = rowHeight ?? (compact ? COMPACT_ROW_HEIGHT : DEFAULT_ROW_HEIGHT);
  const effectiveGroupRowHeight = compact ? COMPACT_GROUP_ROW_HEIGHT : GROUP_ROW_HEIGHT;

  const stickyIds = useMemo(
    () => (Array.isArray(stickyColumnIds) ? stickyColumnIds.filter(Boolean) : []),
    [stickyColumnIds],
  );

  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: compact ? { minSize: 28 } : { size: 120, minSize: 40 },
  });

  const rows = table.getRowModel().rows;
  const visibleHeaders = table.getHeaderGroups()[0]?.headers ?? [];
  const visibleColumnsKey = visibleHeaders.map((header) => header.column.id).join(',');

  const stickyLeftByColId = useMemo(() => {
    const offsets = {};
    let left = 0;
    stickyIds.forEach((colId) => {
      offsets[colId] = left;
      if (compact) {
        left += measuredStickyWidths[colId] ?? 0;
      } else {
        const colDef = columns.find((col) => (col.accessorKey ?? col.id) === colId);
        left += colDef?.size ?? 120;
      }
    });
    return offsets;
  }, [stickyIds, columns, compact, measuredStickyWidths]);

  const getColumnWidth = useCallback((colId, header) => {
    if (compact) return undefined;
    const colDef = columns.find((col) => (col.accessorKey ?? col.id) === colId);
    return header?.getSize?.() ?? colDef?.size ?? 120;
  }, [columns, compact]);

  const applyWidthStyle = useCallback((baseStyle, width) => {
    if (width == null) return baseStyle;
    return { ...baseStyle, width, minWidth: width, maxWidth: width };
  }, []);

  const getRowHeight = useCallback(
    (index) => (rows[index]?.original?._isGroupHeader ? effectiveGroupRowHeight : effectiveRowHeight),
    [rows, effectiveGroupRowHeight, effectiveRowHeight],
  );

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
    const frame = window.requestAnimationFrame(measure);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [compact, stickyIds, visibleColumnsKey, data.length]);

  const panelVirtualizer = useVirtualizer({
    count: pageScroll ? 0 : rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => getRowHeight(index),
    overscan: 12,
  });

  const applyStickyStyle = useCallback((colId, baseStyle = {}) => {
    if (!stickyIds.includes(colId)) return baseStyle;
    return {
      ...baseStyle,
      position: 'sticky',
      left: stickyLeftByColId[colId] ?? 0,
      zIndex: baseStyle.zIndex ?? 3,
      background: baseStyle.background ?? 'var(--st-surface)',
    };
  }, [stickyIds, stickyLeftByColId]);

  const headerStyle = {
    background: 'var(--st-grid-header-bg)',
    color: 'var(--st-grid-header-fg)',
  };

  const dataRowIndices = useMemo(
    () => rows.map((row, idx) => ({ idx, isGroup: !!row.original?._isGroupHeader })).filter((r) => !r.isGroup),
    [rows],
  );

  const moveFocus = useCallback((rowDelta, colDelta) => {
    if (!dataRowIndices.length || !visibleHeaders.length) return;
    setFocusedCell((prev) => {
      const currentPos = prev?.dataRowPos ?? 0;
      const colIndex = prev?.colIndex ?? 0;
      const nextPos = Math.max(0, Math.min(dataRowIndices.length - 1, currentPos + rowDelta));
      const nextCol = Math.max(0, Math.min(visibleHeaders.length - 1, colIndex + colDelta));
      return { dataRowPos: nextPos, colIndex: nextCol, rowIndex: dataRowIndices[nextPos].idx };
    });
  }, [dataRowIndices, visibleHeaders.length]);

  useEffect(() => {
    if (!enableKeyboardNav) return undefined;
    const onKeyDown = (event) => {
      if (!focusedCell) return;
      const target = event.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          moveFocus(-1, 0);
          break;
        case 'ArrowDown':
          event.preventDefault();
          moveFocus(1, 0);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          moveFocus(0, -1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          moveFocus(0, 1);
          break;
        case 'Tab':
          event.preventDefault();
          moveFocus(0, event.shiftKey ? -1 : 1);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enableKeyboardNav, focusedCell, moveFocus]);

  useEffect(() => {
    if (dataRowIndices.length && visibleHeaders.length && !focusedCell) {
      setFocusedCell({ dataRowPos: 0, colIndex: 0, rowIndex: dataRowIndices[0].idx });
    }
  }, [dataRowIndices, visibleHeaders.length, focusedCell]);

  const virtualRows = pageScroll ? [] : panelVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length
    ? panelVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
    : 0;

  const rowIndexes = pageScroll
    ? rows.map((_, index) => index)
    : virtualRows.map((item) => item.index);

  const renderBodyRow = (rowIndex) => {
    const row = rows[rowIndex];
    if (row.original?._isGroupHeader) {
      return (
        <tr key={row.id} className="group-header" style={{ height: effectiveGroupRowHeight }}>
          <td colSpan={visibleHeaders.length}>{row.original._groupLabel}</td>
        </tr>
      );
    }
    return (
      <tr key={row.id} data-index={rowIndex} style={{ height: effectiveRowHeight }}>
        {row.getVisibleCells().map((cell, colIndex) => {
          const colId = cell.column.id;
          const header = visibleHeaders.find((item) => item.column.id === colId);
          const width = getColumnWidth(colId, header);
          const isFocused = focusedCell
            && focusedCell.rowIndex === rowIndex
            && focusedCell.colIndex === colIndex;
          let cellStyle = applyWidthStyle(
            applyStickyStyle(colId, {
              zIndex: stickyIds.includes(colId) ? 4 : undefined,
            }),
            width,
          );
          if (cell.column.columnDef.meta?.numeric) {
            cellStyle.textAlign = 'right';
          }
          const precomputedStyle = row.original?._heatStyles?.[colId];
          if (precomputedStyle) {
            Object.assign(cellStyle, precomputedStyle);
          } else if (typeof cell.column.columnDef.cellStyle === 'function') {
            Object.assign(cellStyle, cell.column.columnDef.cellStyle(cell.getContext()));
          } else if (cell.column.columnDef.cellStyle) {
            Object.assign(cellStyle, cell.column.columnDef.cellStyle);
          }
          if (isFocused) {
            cellStyle = { ...cellStyle, outline: '2px solid var(--st-focus-ring)', outlineOffset: '-2px' };
          }
          return (
            <td
              key={cell.id}
              data-col-id={colId}
              tabIndex={isFocused ? 0 : -1}
              className={cell.column.columnDef.meta?.numeric ? 'numeric-cell' : undefined}
              style={cellStyle}
              onClick={() => setFocusedCell({
                dataRowPos: dataRowIndices.findIndex((item) => item.idx === rowIndex),
                colIndex,
                rowIndex,
              })}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className={`research-grid-shell${pageScroll ? ' research-grid-shell-page' : ''}`}>
      <div
        ref={scrollRef}
        className={pageScroll ? 'research-grid-hscroll' : 'research-grid-scroll'}
        style={pageScroll ? undefined : { maxHeight }}
      >
        <table
          className={`st-grid-table research-grid-table${compact ? ' st-grid-table-compact research-grid-table-compact' : ''}`}
          style={{
            tableLayout: compact ? 'auto' : 'fixed',
            width: 'max-content',
          }}
        >
          <thead className={pageScroll ? 'research-grid-thead-page' : undefined}>
            {columnGroups.length > 0 && (
              <tr style={{ ...headerStyle, background: 'var(--st-grid-group-header-bg)' }}>
                {columnGroups.map((group) => (
                  <th
                    key={group.id}
                    colSpan={group.colSpan}
                    style={{ ...headerStyle, textAlign: 'center', fontSize: compact ? 10 : 11 }}
                  >
                    {group.label}
                  </th>
                ))}
              </tr>
            )}
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} style={headerStyle}>
                {headerGroup.headers.map((header) => {
                  const colId = header.column.id;
                  const width = getColumnWidth(colId, header);
                  return (
                    <th
                      key={header.id}
                      data-col-id={colId}
                      className={header.column.columnDef.meta?.numeric ? 'numeric-header' : undefined}
                      style={applyWidthStyle(
                        applyStickyStyle(colId, {
                          ...headerStyle,
                          zIndex: stickyIds.includes(colId) ? 7 : 6,
                        }),
                        width,
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {!pageScroll && paddingTop > 0 && (
              <tr aria-hidden="true">
                <td colSpan={visibleHeaders.length} style={{ height: paddingTop, padding: 0, border: 'none' }} />
              </tr>
            )}
            {rowIndexes.map((rowIndex) => renderBodyRow(rowIndex))}
            {!pageScroll && paddingBottom > 0 && (
              <tr aria-hidden="true">
                <td colSpan={visibleHeaders.length} style={{ height: paddingBottom, padding: 0, border: 'none' }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
