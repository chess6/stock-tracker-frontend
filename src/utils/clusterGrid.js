/** Minimum rendered width (px) before adding another cluster table column. */
export const CLUSTER_COL_MIN_WIDTH = 220;

/** Maximum parallel cluster tables in the screener panel. */
export const CLUSTER_COL_MAX = 4;

/** Target rows per column when deciding whether to split. */
export const CLUSTER_ROWS_PER_COL = 5;

/**
 * Split items into `columnCount` groups with sizes differing by at most one.
 * Earlier groups receive the extra item when count does not divide evenly.
 */
export function splitEvenly(items, columnCount) {
  if (!items?.length) return [];
  const cols = Math.max(1, Math.min(columnCount, items.length));
  if (cols === 1) return [items];

  const base = Math.floor(items.length / cols);
  const remainder = items.length % cols;
  const groups = [];
  let index = 0;

  for (let col = 0; col < cols; col += 1) {
    const size = base + (col < remainder ? 1 : 0);
    groups.push(items.slice(index, index + size));
    index += size;
  }

  return groups;
}

/**
 * Choose how many parallel cluster tables fit the panel width and row count.
 */
export function computeClusterColumns(containerWidth, rowCount) {
  if (rowCount <= 0) return 1;
  if (rowCount <= 3) return 1;

  const byWidth = Math.max(
    1,
    Math.min(CLUSTER_COL_MAX, Math.floor(containerWidth / CLUSTER_COL_MIN_WIDTH)),
  );
  const byRows = Math.max(
    1,
    Math.min(CLUSTER_COL_MAX, Math.ceil(rowCount / CLUSTER_ROWS_PER_COL)),
  );

  return Math.min(byWidth, byRows, rowCount);
}
