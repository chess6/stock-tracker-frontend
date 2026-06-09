import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import {
  ANALYTICS_CHART_HEIGHT_NARRATIVE,
  ANALYTICS_CHART_HEIGHT_SHORT,
  analyticsChartOptions,
} from '../../utils/chartTheme';
import { formatDecimal, formatPercent } from '../../utils/formatters';
import { signedHeatStyle } from '../../utils/heatMap';

function formatSentiment(value) {
  if (value == null) return '-';
  return formatDecimal(value, +2);
}

export default function NarrativePanel({
  narrativeData,
  loading,
  compact = false,
  chartsOnly = false,
  tablesOnly = false,
  deepDive = false,
}) {
  const sentimentTrend = narrativeData?.sentimentTrend;
  const movingAverages = sentimentTrend?.movingAverages || {};
  const divergence = narrativeData?.divergence;
  const topEvents = narrativeData?.topEvents || [];
  const recentArticles = narrativeData?.recentArticles || [];

  const overlayOptions = useMemo(() => analyticsChartOptions({
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: { width: [2, 2], curve: 'smooth' },
    dataLabels: { enabled: false },
    xaxis: {
      type: 'datetime',
      labels: { rotate: -45, style: { fontSize: '9px' } },
    },
    yaxis: [
      {
        seriesName: 'Price',
        labels: { formatter: (value) => formatDecimal(value, 2), style: { fontSize: '9px' } },
        title: { text: undefined },
      },
      {
        opposite: true,
        seriesName: 'Sentiment MA30',
        min: -1,
        max: 1,
        labels: { formatter: (value) => formatDecimal(value, 2), style: { fontSize: '9px' } },
        title: { text: undefined },
      },
    ],
    tooltip: { shared: true },
    colors: ['#5b9cf5', '#f5a623'],
  }), []);

  const overlaySeries = useMemo(() => {
    const overlay = narrativeData?.priceOverlay || [];
    return [
      {
        name: 'Price',
        data: overlay
          .filter((point) => point.close != null)
          .map((point) => ({ x: point.date, y: point.close })),
      },
      {
        name: 'Sentiment MA30',
        data: overlay
          .filter((point) => point.sentimentMa30 != null)
          .map((point) => ({ x: point.date, y: point.sentimentMa30 })),
      },
    ];
  }, [narrativeData]);

  const sentimentOptions = useMemo(() => analyticsChartOptions({
    chart: {
      type: 'area',
      toolbar: { show: false },
      sparkline: { enabled: false },
    },
    stroke: { width: 2, curve: 'smooth' },
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.35, opacityTo: 0.05 },
    },
    dataLabels: { enabled: false },
    xaxis: {
      type: 'datetime',
      labels: { rotate: -45, style: { fontSize: '9px' } },
    },
    yaxis: {
      min: -1,
      max: 1,
      labels: { formatter: (value) => formatDecimal(value, 2), style: { fontSize: '9px' } },
      title: { text: undefined },
    },
    colors: ['#6ecf97'],
    tooltip: {
      y: { formatter: (value) => formatSentiment(value) },
    },
  }), []);

  const sentimentSeries = useMemo(() => ([{
    name: 'Sentiment',
    data: (sentimentTrend?.dailySeries || []).map((point) => ({
      x: point.date,
      y: point.avgSentiment,
    })),
  }]), [sentimentTrend]);

  if (loading && !narrativeData) {
    return <div className="research-chart-empty">Loading narrative correlation…</div>;
  }

  if (!narrativeData) {
    return <div className="research-chart-empty">No narrative data available.</div>;
  }

  const overlayHeight = deepDive
    ? ANALYTICS_CHART_HEIGHT_NARRATIVE
    : (compact ? ANALYTICS_CHART_HEIGHT_SHORT : 260);
  const sentimentHeight = compact ? 110 : 180;
  const showCharts = deepDive || !tablesOnly;
  const showTables = deepDive || !chartsOnly;

  const inlineStats = (
    <div className="research-stat-strip research-narrative-stat-strip">
      <span className="research-stat-strip-item">
        <span className="research-stat-strip-label">30d</span>
        <span className="research-stat-strip-value st-num" style={signedHeatStyle((movingAverages['30d'] || 0) * 100, 50)}>
          {formatSentiment(movingAverages['30d'])}
        </span>
      </span>
      <span className="research-stat-strip-item">
        <span className="research-stat-strip-label">90d</span>
        <span className="research-stat-strip-value st-num" style={signedHeatStyle((movingAverages['90d'] || 0) * 100, 50)}>
          {formatSentiment(movingAverages['90d'])}
        </span>
      </span>
      <span className="research-stat-strip-item">
        <span className="research-stat-strip-label">180d</span>
        <span className="research-stat-strip-value st-num" style={signedHeatStyle((movingAverages['180d'] || 0) * 100, 50)}>
          {formatSentiment(movingAverages['180d'])}
        </span>
      </span>
      <span className="research-stat-strip-item research-stat-strip-divergence">
        {divergence ? (
          <span className={divergence.type === 'bullish_divergence' ? 'research-text-positive' : 'research-text-warning'}>
            {divergence.type === 'bullish_divergence' ? 'Bullish' : 'Bearish'} div.
          </span>
        ) : (
          <span className="research-text-muted">No 90d div.</span>
        )}
      </span>
    </div>
  );

  const topEventsTable = topEvents.length > 0 && (
    <div className="research-narrative-table-wrap research-narrative-table-wrap-compact">
      <table className="st-grid-table research-narrative-table mb-0">
        <thead>
          <tr>
            <th>Date</th>
            <th>Event</th>
            <th>Sent.</th>
            <th className="numeric-header">Abn.</th>
            <th>Title</th>
          </tr>
        </thead>
        <tbody>
          {topEvents.map((event) => (
            <tr key={`${event.articleId}-${event.publishedAt}`}>
              <td>{(event.publishedAt || '').slice(0, 10)}</td>
              <td>{event.eventType || '-'}</td>
              <td style={signedHeatStyle((event.sentimentScore || 0) * 100, 50)}>
                {formatSentiment(event.sentimentScore)}
              </td>
              <td className="numeric-cell" style={signedHeatStyle((event.abnormalReturn1d || 0) * 100, 5)}>
                {event.abnormalReturn1d == null ? '-' : formatPercent(event.abnormalReturn1d * 100, 2)}
              </td>
              <td>
                {event.url ? (
                  <a href={event.url} target="_blank" rel="noopener noreferrer" className="st-link-muted" title={event.title}>{event.title}</a>
                ) : (
                  event.title
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (deepDive) {
    return (
      <div className="research-narrative-panel research-narrative-deep-dive">
        {inlineStats}
        {overlaySeries[0]?.data?.length >= 2 && (
          <div className="research-chart-plot research-chart-plot-narrative">
            <Chart options={overlayOptions} series={overlaySeries} type="line" height={overlayHeight} />
          </div>
        )}
        {topEventsTable}
      </div>
    );
  }

  const statsRow = (
    <div className={`row g-1 ${compact ? 'mb-1' : 'mb-2'}`}>
      <div className={compact ? 'col-4' : 'col-4 col-md-2'}>
        <div className="research-narrative-stat">
          <div className="text-muted small">30d avg</div>
          <div className="fw-semibold small" style={signedHeatStyle((movingAverages['30d'] || 0) * 100, 50)}>
            {formatSentiment(movingAverages['30d'])}
          </div>
        </div>
      </div>
      <div className={compact ? 'col-4' : 'col-4 col-md-2'}>
        <div className="research-narrative-stat">
          <div className="text-muted small">90d avg</div>
          <div className="fw-semibold small" style={signedHeatStyle((movingAverages['90d'] || 0) * 100, 50)}>
            {formatSentiment(movingAverages['90d'])}
          </div>
        </div>
      </div>
      <div className={compact ? 'col-4' : 'col-4 col-md-2'}>
        <div className="research-narrative-stat">
          <div className="text-muted small">180d avg</div>
          <div className="fw-semibold small" style={signedHeatStyle((movingAverages['180d'] || 0) * 100, 50)}>
            {formatSentiment(movingAverages['180d'])}
          </div>
        </div>
      </div>
      {!compact && (
        <div className="col-12 col-md-6">
          {divergence ? (
            <div className={`alert py-1 px-2 mb-0 small ${divergence.type === 'bullish_divergence' ? 'alert-success' : 'alert-warning'}`}>
              <strong>{divergence.type === 'bullish_divergence' ? 'Bullish divergence' : 'Bearish divergence'}:</strong>
              {' '}
              {divergence.description}
              {' '}
              (sentiment {formatSentiment(divergence.sentimentChange90d)}, price {formatPercent((divergence.priceChange90d || 0) * 100, 1)})
            </div>
          ) : (
            <div className="small text-muted">No strong sentiment/price divergence detected in the last 90 days.</div>
          )}
        </div>
      )}
    </div>
  );

  const divergenceNote = compact && !chartsOnly && (
    <div className="small mb-1">
      {divergence ? (
        <span className={divergence.type === 'bullish_divergence' ? 'text-success' : 'text-warning'}>
          {divergence.type === 'bullish_divergence' ? 'Bullish' : 'Bearish'} divergence detected
        </span>
      ) : (
        <span className="text-muted">No 90d divergence</span>
      )}
    </div>
  );

  return (
    <div className="research-narrative-panel">
      {showCharts && statsRow}
      {showCharts && compact && divergenceNote}

      {showCharts && overlaySeries[0]?.data?.length >= 2 && (
        <div className={compact ? 'mb-1' : 'mb-2'}>
          {!compact && <div className="small fw-semibold mb-1">Price vs Sentiment Overlay</div>}
          <div className="research-chart-plot research-chart-plot-short">
            <Chart options={overlayOptions} series={overlaySeries} type="line" height={overlayHeight} />
          </div>
        </div>
      )}

      {showCharts && !compact && sentimentSeries[0]?.data?.length >= 2 && (
        <div className="mb-2">
          <div className="small fw-semibold mb-1">Daily Sentiment Trend</div>
          <Chart options={sentimentOptions} series={sentimentSeries} type="area" height={sentimentHeight} />
        </div>
      )}

      {showTables && (
        <div className="row g-1">
          {topEvents.length > 0 && (
            <div className={compact ? 'col-xl-6' : 'col-12'}>
              {!compact && <div className="small fw-semibold mb-1">Top Market Reactions</div>}
              <div className="table-responsive research-narrative-table-wrap">
                <table className="table table-sm table-striped mb-0 research-narrative-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Event</th>
                      <th>Sent.</th>
                      <th className="text-end">Abn.</th>
                      <th>Title</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topEvents.map((event) => (
                      <tr key={`${event.articleId}-${event.publishedAt}`}>
                        <td>{(event.publishedAt || '').slice(0, 10)}</td>
                        <td>{event.eventType || '-'}</td>
                        <td style={signedHeatStyle((event.sentimentScore || 0) * 100, 50)}>
                          {formatSentiment(event.sentimentScore)}
                        </td>
                        <td className="text-end" style={signedHeatStyle((event.abnormalReturn1d || 0) * 100, 5)}>
                          {event.abnormalReturn1d == null ? '-' : formatPercent(event.abnormalReturn1d * 100, 2)}
                        </td>
                        <td>
                          {event.url ? (
                            <a href={event.url} target="_blank" rel="noopener noreferrer" className="st-link-muted" title={event.title}>{event.title}</a>
                          ) : (
                            event.title
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {recentArticles.length > 0 && !compact && (
            <div className="col-12">
              <div className="small fw-semibold mb-1">Recent Linked Articles</div>
              <div className="table-responsive research-narrative-table-wrap">
                <table className="table table-sm table-striped mb-0 research-narrative-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Sent.</th>
                      <th>Event</th>
                      <th>Title</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentArticles.slice(0, 10).map((article) => (
                      <tr key={`${article.articleId}-${article.publishedAt}`}>
                        <td>{(article.publishedAt || '').slice(0, 10)}</td>
                        <td style={signedHeatStyle((article.sentimentScore || 0) * 100, 50)}>
                          {formatSentiment(article.sentimentScore)}
                        </td>
                        <td>{article.eventType || '-'}</td>
                        <td>
                          {article.url ? (
                            <a href={article.url} target="_blank" rel="noopener noreferrer" className="st-link-muted" title={article.title}>{article.title}</a>
                          ) : (
                            article.title
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
