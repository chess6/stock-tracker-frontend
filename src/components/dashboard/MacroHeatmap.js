import { signedHeatStyle } from '../../utils/heatMap';
import { formatDecimal, formatPercent } from '../../utils/formatters';

/**
 * Dense grouped heatmap for macro snapshot — color by day % change.
 */
export default function MacroHeatmap({ sections = [] }) {
  if (!sections.length) return null;

  return (
    <div className="macro-heatmap">
      <div className="macro-heatmap-legend" aria-hidden="true">
        <span className="macro-heatmap-legend-label">-5%</span>
        <div className="macro-heatmap-scale" />
        <span className="macro-heatmap-legend-label">+5%</span>
      </div>
      {sections.map((section) => (
        <div key={section.id} className="macro-heatmap-row">
          <div className="macro-heatmap-group">{section.label}</div>
          <div className="macro-heatmap-cells">
            {section.items.map((item) => {
              const heat = item.available !== false && item.changePct != null
                ? signedHeatStyle(item.changePct, 5)
                : {};
              const title = [
                item.label,
                item.symbol,
                item.price != null ? formatDecimal(item.price, 2) : '—',
                item.changePct != null ? formatPercent(item.changePct, 2) : 'unavailable',
              ].join(' · ');

              return (
                <div
                  key={item.id}
                  className={`macro-heatmap-cell${item.available === false ? ' macro-heatmap-cell-muted' : ''}`}
                  style={heat}
                  title={title}
                >
                  <div className="macro-heatmap-symbol">{item.symbol}</div>
                  <div className="macro-heatmap-pct st-num">
                    {item.available !== false && item.changePct != null
                      ? formatPercent(item.changePct, 2)
                      : '—'}
                  </div>
                  <div className="macro-heatmap-price st-num">
                    {item.price != null ? formatDecimal(item.price, 2) : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
