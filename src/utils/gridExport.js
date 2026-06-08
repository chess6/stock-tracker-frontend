/** Escape a cell value for CSV/TSV export. */
export function escapeCsvCell(value) {
  if (value == null || value === '') return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsv(headers, rows) {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const bodyLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  return [headerLine, ...bodyLines].join('\n');
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function rawExportValue(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return String(value);
}

/** Screener grid: metrics as rows, tickers as columns. */
export function buildScreenerExport(screenerGridRows, screenerTickers) {
  const headers = ['Metric', ...screenerTickers];
  const rows = screenerGridRows
    .filter((row) => !row._isGroupHeader)
    .map((row) => [
      row.metric || '',
      ...screenerTickers.map((_, idx) => rawExportValue(row[`t${idx}`])),
    ]);
  return { headers, rows };
}

/** Deep-dive grid: metrics as rows, periods as columns. */
export function buildDetailExport(detailGridRows, { includeYoY = false, includeCagr = false } = {}) {
  const sample = detailGridRows.find((row) => !row._isGroupHeader);
  const periodCount = sample
    ? Object.keys(sample).filter((key) => /^p\d+$/.test(key)).length
    : 0;
  const headers = ['Metric'];
  for (let idx = 0; idx < periodCount; idx += 1) {
    headers.push(`Period ${idx + 1}`);
  }
  if (includeYoY) headers.push('YoY %');
  if (includeCagr) headers.push('CAGR %');

  const rows = detailGridRows
    .filter((row) => !row._isGroupHeader)
    .map((row) => {
      const line = [row.metric || ''];
      for (let idx = 0; idx < periodCount; idx += 1) {
        line.push(rawExportValue(row[`p${idx}`]));
      }
      if (includeYoY) line.push(rawExportValue(row.yoy));
      if (includeCagr) line.push(rawExportValue(row.cagr));
      return line;
    });
  return { headers, rows };
}

export function exportGridCsv(filename, headers, rows) {
  downloadCsv(filename, rowsToCsv(headers, rows));
}

export async function exportGridClipboard(headers, rows) {
  await copyTextToClipboard(rowsToCsv(headers, rows));
}
