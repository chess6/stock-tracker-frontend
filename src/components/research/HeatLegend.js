const TIERS = [
  { tier: 0, label: 'Distress', className: 'research-heat-legend-tier-0' },
  { tier: 2, label: 'Neutral', className: 'research-heat-legend-tier-2' },
  { tier: 4, label: 'Strong', className: 'research-heat-legend-tier-4' },
  { tier: 5, label: 'Elite', className: 'research-heat-legend-tier-5' },
];

export default function HeatLegend({ colorMode = 'deep_value' }) {
  return (
    <div className="research-heat-legend" aria-label="Heatmap color legend">
      <span className="research-heat-legend-mode">
        {colorMode === 'deep_value' ? 'Fixed thresholds' : `${colorMode} mode`}
      </span>
      <div className="research-heat-legend-scale">
        {TIERS.map((item) => (
          <span key={item.tier} className={`research-heat-legend-swatch ${item.className}`}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
