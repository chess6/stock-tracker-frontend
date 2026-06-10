import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { useTheme } from '../../context/ThemeContext';
import { signedHeatBackground, signedHeatForeground } from '../../utils/heatMap';
import { formatDecimal, formatPercent } from '../../utils/formatters';
import { mergeApexOptions } from '../../utils/chartTheme';

const HEAT_SCALE = 5;
const MUTED_FILL_DARK = 'rgba(73, 80, 87, 0.35)';
const MUTED_FILL_LIGHT = 'rgba(233, 236, 239, 0.9)';

function cellFill(item, dark) {
  if (item.available === false || item.changePct == null) {
    return dark ? MUTED_FILL_DARK : MUTED_FILL_LIGHT;
  }
  return signedHeatBackground(item.changePct, HEAT_SCALE);
}

function cellLabelColor(item) {
  if (item.available === false || item.changePct == null) {
    return signedHeatForeground(null, HEAT_SCALE);
  }
  return signedHeatForeground(item.changePct, HEAT_SCALE);
}

function treemapValue(item) {
  const price = item.price != null && !Number.isNaN(Number(item.price)) ? Number(item.price) : null;
  return price != null && price > 0 ? price : 1;
}

/**
 * Grouped treemap for macro snapshot — tile size by price, color by day % change.
 */
export default function MacroTreemap({ sections = [] }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const { series, labelColors } = useMemo(() => {
    const built = sections.map((section) => ({
      name: section.label,
      data: section.items.map((item) => ({
        x: item.symbol,
        y: treemapValue(item),
        fillColor: cellFill(item, dark),
        label: item.label,
        changePct: item.changePct,
        price: item.price,
        available: item.available,
      })),
    }));
    const colors = built.flatMap((section) => section.data.map((point) => cellLabelColor(point)));
    return { series: built, labelColors: colors };
  }, [sections, dark]);

  const options = useMemo(() => mergeApexOptions({
    chart: {
      type: 'treemap',
      toolbar: { show: false },
      animations: { enabled: false },
      fontFamily: 'inherit',
    },
    legend: {
      show: true,
      position: 'bottom',
      fontSize: '10px',
      markers: { size: 6 },
      itemMargin: { horizontal: 8, vertical: 0 },
    },
    plotOptions: {
      treemap: {
        distributed: true,
        enableShades: false,
        borderRadius: 3,
        useFillColorAsStroke: true,
        strokeWidth: 1,
        strokeColor: dark ? 'rgba(33, 37, 41, 0.9)' : 'rgba(255, 255, 255, 0.85)',
        dataLabels: {
          enabled: true,
          style: {
            fontSize: '11px',
            fontWeight: 700,
            colors: labelColors,
          },
          formatter(text, opts) {
            const point = opts.w.config.series[opts.seriesIndex].data[opts.dataPointIndex];
            const pct = point.available !== false && point.changePct != null
              ? formatPercent(point.changePct, 2)
              : '—';
            return [text, pct];
          },
        },
      },
    },
    dataLabels: {
      enabled: true,
      dropShadow: { enabled: false },
    },
    tooltip: {
      custom({ seriesIndex, dataPointIndex, w }) {
        const point = w.config.series[seriesIndex].data[dataPointIndex];
        const group = w.config.series[seriesIndex].name;
        const pct = point.available !== false && point.changePct != null
          ? formatPercent(point.changePct, 2)
          : 'unavailable';
        const price = point.price != null ? formatDecimal(point.price, 2) : '—';
        const fg = cellLabelColor(point);
        const bg = dark ? '#212529' : '#ffffff';
        const border = dark ? '#495057' : '#dee2e6';
        return (
          `<div class="macro-treemap-tooltip" style="padding:0.45rem 0.55rem;font-size:0.72rem;line-height:1.35;background:${bg};color:${fg};border:1px solid ${border};border-radius:0.25rem;">`
          + `<div style="font-weight:700;margin-bottom:0.15rem;">${point.label || point.x}</div>`
          + `<div style="opacity:0.85;">${group} · ${point.x}</div>`
          + `<div style="margin-top:0.2rem;font-variant-numeric:tabular-nums;">${price} · ${pct}</div>`
          + '</div>'
        );
      },
    },
    states: {
      hover: { filter: { type: 'lighten', value: 0.08 } },
      active: { filter: { type: 'none' } },
    },
  }), [dark, labelColors]);

  const height = useMemo(() => {
    const tileCount = sections.reduce((sum, section) => sum + section.items.length, 0);
    return Math.min(420, Math.max(260, 180 + tileCount * 14));
  }, [sections]);

  if (!sections.length) return null;

  return (
    <div className="macro-treemap">
      <div className="macro-treemap-legend" aria-hidden="true">
        <span className="macro-treemap-legend-label">-5%</span>
        <div className="macro-treemap-scale" />
        <span className="macro-treemap-legend-label">+5%</span>
      </div>
      <Chart options={options} series={series} type="treemap" height={height} />
    </div>
  );
}
