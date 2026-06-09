import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import API_ENDPOINTS from '../../apiConfig';
import { formatCompactUsd, formatDecimal } from '../../utils/formatters';
import { insiderDollarStyle } from '../../utils/heatMap';

function intensityStyle(score) {
  if (score == null || Number.isNaN(Number(score))) return {};
  const num = Number(score);
  const alpha = 0.15 + num * 0.45;
  return {
    backgroundColor: `rgba(40, 167, 69, ${alpha})`,
    fontVariantNumeric: 'tabular-nums',
  };
}

function RatioCell({ label, data }) {
  if (!data) return null;
  return (
    <tr>
      <td className="small">{label}</td>
      <td className="small text-end">{data.buyCount ?? 0}</td>
      <td className="small text-end">{data.sellCount ?? 0}</td>
      <td className="small text-end">
        {data.buySellCountRatio != null ? formatDecimal(data.buySellCountRatio, 2) : '-'}
      </td>
      <td className="small text-end" style={insiderDollarStyle(data.totalBuyValue)}>
        {data.totalBuyValue != null ? formatCompactUsd(data.totalBuyValue) : '-'}
      </td>
      <td className="small text-end" style={intensityStyle(data.intensityScore)}>
        {data.intensityScore != null ? formatDecimal(data.intensityScore, 3) : '-'}
      </td>
    </tr>
  );
}

function ScreenerClusterTable({ clusters, loading }) {
  if (loading) return <div className="p-2 small">Loading insider clusters…</div>;
  if (!clusters?.length) {
    return (
      <div className="p-2 small text-muted">
        No insider buy clusters detected. Clusters require 3+ unique buyers within 30 days.
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-sm table-hover mb-0 research-insider-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Window</th>
            <th className="text-end">Buyers</th>
            <th className="text-end">Buy Value</th>
            <th className="text-end">Intensity</th>
          </tr>
        </thead>
        <tbody>
          {clusters.map((row) => (
            <tr key={`${row.ticker}-${row.windowStart}`}>
              <td>
                <Link to={`/research/${row.ticker}`} className="st-ticker">
                  {row.ticker}
                </Link>
                {row.companyName && (
                  <div className="text-muted research-insider-subtitle">{row.companyName}</div>
                )}
              </td>
              <td className="small">
                {(row.windowStart || '').slice(0, 10)} → {(row.windowEnd || '').slice(0, 10)}
              </td>
              <td className="text-end">{row.uniqueBuyers ?? '-'}</td>
              <td className="text-end" style={insiderDollarStyle(row.totalBuyValue)}>
                {row.totalBuyValue != null ? formatCompactUsd(row.totalBuyValue) : '-'}
              </td>
              <td className="text-end" style={intensityStyle(row.intensityScore)}>
                {row.intensityScore != null ? formatDecimal(row.intensityScore, 3) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeepDiveInsiderPanel({ insiderAnalysis }) {
  const summary = insiderAnalysis?.summary;
  const clusters = insiderAnalysis?.clusters || [];
  const recent = insiderAnalysis?.recentTransactions || [];

  if (!summary) {
    return <div className="p-2 small text-muted">No insider analysis available.</div>;
  }

  return (
    <>
      <div className="research-stat-strip research-insider-summary-strip">
        <span className="research-stat-strip-item">
          <span className="research-stat-strip-label">Buys 90d</span>
          <span className="research-stat-strip-value st-num">{summary.buyCount90d ?? 0}</span>
        </span>
        <span className="research-stat-strip-item">
          <span className="research-stat-strip-label">Sells 90d</span>
          <span className="research-stat-strip-value st-num">{summary.sellCount90d ?? 0}</span>
        </span>
        <span className="research-stat-strip-item">
          <span className="research-stat-strip-label">Buyers</span>
          <span className="research-stat-strip-value st-num">{summary.uniqueBuyers90d ?? 0}</span>
        </span>
        <span className="research-stat-strip-item">
          <span className="research-stat-strip-label">Intensity</span>
          <span className="research-stat-strip-value st-num" style={intensityStyle(summary.intensityScore90d)}>
            {summary.intensityScore90d != null ? formatDecimal(summary.intensityScore90d, 3) : '-'}
          </span>
        </span>
      </div>

      <div className="research-insider-tables-row">
        <div className="research-insider-section">
          <div className="research-section-label">Buy/Sell Ratios</div>
          <div className="research-narrative-table-wrap research-insider-ratios-wrap">
            <table className="st-grid-table research-insider-table mb-0">
              <thead>
                <tr>
                  <th>Window</th>
                  <th className="text-end">Buys</th>
                  <th className="text-end">Sells</th>
                  <th className="text-end">Ratio</th>
                  <th className="text-end">Buy Value</th>
                  <th className="text-end">Intensity</th>
                </tr>
              </thead>
              <tbody>
                <RatioCell label="90d" data={summary.ratios?.['90d']} />
                <RatioCell label="180d" data={summary.ratios?.['180d']} />
                <RatioCell label="365d" data={summary.ratios?.['365d']} />
              </tbody>
            </table>
          </div>
        </div>

        {recent.length > 0 && (
          <div className="research-insider-section">
            <div className="research-section-label">Recent Transactions</div>
            <div className="research-narrative-table-wrap research-insider-recent">
              <table className="st-grid-table research-insider-table mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Owner</th>
                    <th>Code</th>
                    <th className="text-end">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.slice(0, 25).map((txn, idx) => (
                    <tr key={`${txn.transactionDate}-${txn.ownerName}-${idx}`}>
                      <td className="small">{(txn.transactionDate || txn.filingDate || '').slice(0, 10)}</td>
                      <td className="small">{txn.ownerName || '-'}</td>
                      <td className="small">
                        <span className={txn.isBuy ? 'text-success' : txn.isSell ? 'text-danger' : ''}>
                          {txn.transactionCode || '-'}
                        </span>
                      </td>
                      <td
                        className="small text-end"
                        style={insiderDollarStyle(txn.isBuy ? txn.transactionValue : -(txn.transactionValue || 0))}
                      >
                        {txn.transactionValue != null ? formatCompactUsd(txn.transactionValue) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {clusters.length > 0 && (
        <div className="research-insider-section">
          <div className="research-section-label">Buy Clusters (3+ buyers / 30d)</div>
          <div className="research-narrative-table-wrap research-insider-ratios-wrap">
            <table className="st-grid-table research-insider-table mb-0">
              <thead>
                <tr>
                  <th>Window</th>
                  <th className="text-end">Buyers</th>
                  <th className="text-end">Buys</th>
                  <th className="text-end">Buy Value</th>
                  <th className="text-end">Avg Price</th>
                  <th className="text-end">Intensity</th>
                </tr>
              </thead>
              <tbody>
                {clusters.map((cluster) => (
                  <tr key={`${cluster.windowStart}-${cluster.windowEnd}`}>
                    <td className="small">
                      {(cluster.windowStart || '').slice(0, 10)} → {(cluster.windowEnd || '').slice(0, 10)}
                    </td>
                    <td className="text-end">{cluster.uniqueBuyers}</td>
                    <td className="text-end">{cluster.buyCount}</td>
                    <td className="text-end" style={insiderDollarStyle(cluster.totalBuyValue)}>
                      {cluster.totalBuyValue != null ? formatCompactUsd(cluster.totalBuyValue) : '-'}
                    </td>
                    <td className="text-end">
                      {cluster.avgBuyPrice != null ? formatDecimal(cluster.avgBuyPrice, 2) : '-'}
                    </td>
                    <td className="text-end" style={intensityStyle(cluster.intensityScore)}>
                      {cluster.intensityScore != null ? formatDecimal(cluster.intensityScore, 3) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </>
  );
}

export default function InsiderPanel({ mode, tickers, insiderAnalysis, embedded = false }) {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(false);

  const tickerKey = useMemo(
    () => (tickers?.length ? tickers.join(',') : ''),
    [tickers],
  );

  useEffect(() => {
    if (mode !== 'screener' || !tickers?.length) {
      setClusters([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    axios
      .get(API_ENDPOINTS.RESEARCH_INSIDER_CLUSTERS, { params: { tickers: tickers.join(','), limit: 50 } })
      .then((res) => {
        if (!cancelled) setClusters(res.data?.clusters || []);
      })
      .catch(() => {
        if (!cancelled) setClusters([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [mode, tickerKey, tickers]);

  if (embedded) {
    return (
      <div className="research-insider-panel">
        {mode === 'screener' ? (
          <ScreenerClusterTable clusters={clusters} loading={loading} />
        ) : (
          <DeepDiveInsiderPanel insiderAnalysis={insiderAnalysis} />
        )}
      </div>
    );
  }

  return (
    <div className="st-panel mb-2 research-insider-panel">
      <div className="st-panel-header">
        {mode === 'screener' ? 'Insider Buy Clusters' : 'Insider Activity'}
      </div>
      <div className="st-panel-body-flush">
        {mode === 'screener' ? (
          <ScreenerClusterTable clusters={clusters} loading={loading} />
        ) : (
          <DeepDiveInsiderPanel insiderAnalysis={insiderAnalysis} />
        )}
      </div>
    </div>
  );
}
