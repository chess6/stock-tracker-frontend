import { formatDecimal } from '../../utils/formatters';
import { getMetricBackground } from '../../utils/scoringColors';

const BADGES = [
  { key: 'piotroskiF', label: 'F', format: 'int' },
  { key: 'altmanZ', label: 'Z', format: 'decimal' },
  { key: 'beneishM', label: 'M', format: 'decimal' },
  { key: 'survivability', label: 'S', format: 'int' },
];

function formatBadgeValue(key, format, value) {
  if (value == null) return null;
  if (format === 'decimal') return formatDecimal(value, 1);
  if (key === 'survivability') return Math.round(value);
  return value;
}

export default function ResearchCompactScoreBadges({ scores }) {
  if (!scores) return null;

  const items = BADGES.map((badge) => {
    const value = scores[badge.key];
    const rendered = formatBadgeValue(badge.key, badge.format, value);
    if (rendered == null) return null;
    return {
      ...badge,
      value: rendered,
      style: getMetricBackground(badge.key, value, { mode: 'deep_value' }),
    };
  }).filter(Boolean);

  if (!items.length) return null;

  return (
    <div className="research-compact-score-badges" aria-label="Score badges">
      {items.map((item) => (
        <span
          key={item.key}
          className="research-compact-score-badge"
          title={`${item.label}: ${item.value}`}
          style={item.style}
        >
          {item.label}
          {item.value}
        </span>
      ))}
    </div>
  );
}
