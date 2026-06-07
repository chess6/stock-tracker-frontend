export function isDarkTheme() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute('data-bs-theme') === 'dark';
}

/** Shared ApexCharts options for light/dark readability. */
export function apexBaseOptions() {
  const dark = isDarkTheme();
  if (!dark) {
    return {
      theme: { mode: 'light' },
      chart: {
        foreColor: '#373d3f',
        background: 'transparent',
      },
      grid: { borderColor: '#dee2e6' },
      tooltip: { theme: 'light' },
      dataLabels: {
        style: { colors: ['#212529'] },
      },
    };
  }
  return {
    theme: { mode: 'dark' },
    chart: {
      foreColor: '#dee2e6',
      background: 'transparent',
    },
    grid: { borderColor: '#495057' },
    xaxis: {
      labels: { style: { colors: '#adb5bd' } },
      title: { style: { color: '#dee2e6' } },
    },
    yaxis: {
      labels: { style: { colors: '#adb5bd' } },
      title: { style: { color: '#dee2e6' } },
    },
    title: { style: { color: '#f8f9fa' } },
    legend: { labels: { colors: '#dee2e6' } },
    tooltip: { theme: 'dark' },
    dataLabels: {
      style: { colors: ['#f8f9fa'] },
    },
  };
}

export function mergeApexOptions(specific = {}) {
  const base = apexBaseOptions();
  return {
    ...base,
    ...specific,
    chart: { ...base.chart, ...specific.chart },
    grid: { ...base.grid, ...specific.grid },
    xaxis: { ...base.xaxis, ...specific.xaxis },
    yaxis: Array.isArray(specific.yaxis)
      ? specific.yaxis
      : { ...base.yaxis, ...specific.yaxis },
    title: { ...base.title, ...specific.title },
    legend: { ...base.legend, ...specific.legend },
    tooltip: { ...base.tooltip, ...specific.tooltip },
    dataLabels: { ...base.dataLabels, ...specific.dataLabels },
    theme: { ...base.theme, ...specific.theme },
  };
}
