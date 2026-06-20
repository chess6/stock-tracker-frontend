import { useEffect, useMemo, useRef } from 'react';
import Chart from 'react-apexcharts';
import { useTheme } from '../../context/ThemeContext';
import { signedHeatBackground, signedHeatForeground } from '../../utils/heatMap';
import { formatDecimal, formatPercent } from '../../utils/formatters';
import { mergeApexOptions } from '../../utils/chartTheme';

const HEAT_SCALE = 5;
const MUTED_FILL_DARK = 'rgba(73, 80, 87, 0.35)';
const MUTED_FILL_LIGHT = 'rgba(233, 236, 239, 0.9)';
const SELECTED_FILL_DARK = 'rgba(255, 193, 7, 0.42)';
const SELECTED_FILL_LIGHT = 'rgba(255, 193, 7, 0.28)';

function cellFill(item, dark, selected = false) {
  if (selected) {
    return dark ? SELECTED_FILL_DARK : SELECTED_FILL_LIGHT;
  }
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

function bindTreemapTileClicks(root, sectionsRef, onToggleRef) {
  if (!root) return () => {};

  const handleClick = (event) => {
    const rectNode = event.target.closest('.apexcharts-treemap-rect');
    if (!rectNode || !root.contains(rectNode)) return;

    const seriesNode = rectNode.closest('.apexcharts-series');
    if (!seriesNode) return;

    const seriesIndex = [...root.querySelectorAll('.apexcharts-series')].indexOf(seriesNode);
    const section = sectionsRef.current[seriesIndex];
    if (!section) return;

    const dataPointIndex = [...seriesNode.querySelectorAll('.apexcharts-treemap-rect')].indexOf(rectNode);
    const item = section.items[dataPointIndex];
    if (item?.id) onToggleRef.current?.(item.id);
  };

  root.addEventListener('click', handleClick);

  root.querySelectorAll('.apexcharts-series').forEach((seriesNode, seriesIndex) => {
    const section = sectionsRef.current[seriesIndex];
    if (!section) return;
    seriesNode.querySelectorAll('.apexcharts-treemap-rect').forEach((rectNode, dataPointIndex) => {
      const item = section.items[dataPointIndex];
      rectNode.style.cursor = 'pointer';
      rectNode.setAttribute('role', 'button');
      rectNode.setAttribute('aria-label', `Filter portfolio by ${item?.label || item?.symbol}`);
    });
  });

  return () => root.removeEventListener('click', handleClick);
}

/**
 * Grouped treemap for macro snapshot — tile size by price, color by day % change.
 * All tiles are clickable to filter the dashboard portfolio.
 */
export default function MacroTreemap({
  sections = [],
  selectedTileIds = new Set(),
  onTileToggle,
  /** @deprecated */ selectedIndustryIds,
  /** @deprecated */ onIndustryToggle,
}) {
  const resolvedSelected = selectedTileIds ?? selectedIndustryIds ?? new Set();
  const resolvedToggle = onTileToggle ?? onIndustryToggle;
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const onToggleRef = useRef(resolvedToggle);
  onToggleRef.current = resolvedToggle;
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    let frameId = 0;

    const attach = () => {
      if (cancelled) return;
      const svg = containerRef.current?.querySelector('.apexcharts-svg');
      if (!svg) {
        frameId = window.requestAnimationFrame(attach);
        return;
      }
      cleanup = bindTreemapTileClicks(svg, sectionsRef, onToggleRef);
    };

    attach();

    return () => {
      cancelled = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      cleanup();
    };
  }, [sections, resolvedSelected, resolvedToggle]);

  const { series, labelColors } = useMemo(() => {
    const built = sections.map((section) => ({
      name: section.label,
      data: section.items.map((item) => ({
        x: item.symbol,
        y: treemapValue(item),
        fillColor: cellFill(item, dark, resolvedSelected.has(item.id)),
        label: item.label,
        changePct: item.changePct,
        price: item.price,
        available: item.available,
        macroId: item.id,
        groupId: section.id,
      })),
    }));
    const colors = built.flatMap((section) => section.data.map((point) => cellLabelColor(point)));
    return { series: built, labelColors: colors };
  }, [sections, dark, resolvedSelected]);

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
        const filterHint = '<div style="margin-top:0.25rem;opacity:0.75;">Click to filter portfolio</div>';
        return (
          `<div class="macro-treemap-tooltip" style="padding:0.45rem 0.55rem;font-size:0.72rem;line-height:1.35;background:${bg};color:${fg};border:1px solid ${border};border-radius:0.25rem;">`
          + `<div style="font-weight:700;margin-bottom:0.15rem;">${point.label || point.x}</div>`
          + `<div style="opacity:0.85;">${group} · ${point.x}</div>`
          + `<div style="margin-top:0.2rem;font-variant-numeric:tabular-nums;">${price} · ${pct}</div>`
          + filterHint
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
    <div className="macro-treemap" ref={containerRef}>
      <div className="macro-treemap-legend" aria-hidden="true">
        <span className="macro-treemap-legend-label">-5%</span>
        <div className="macro-treemap-scale" />
        <span className="macro-treemap-legend-label">+5%</span>
      </div>
      <Chart options={options} series={series} type="treemap" height={height} />
      <div className="macro-treemap-hint small text-muted">
        Click any macro tile to filter your portfolio. Select multiple tiles to combine matches.
      </div>
    </div>
  );
}
