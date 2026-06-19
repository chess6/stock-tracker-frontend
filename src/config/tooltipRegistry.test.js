import {
  TOOLTIP_REGISTRY,
  getMetricTooltip,
  getMetricTooltipMeta,
  formatMetricCellTooltip,
} from './tooltipRegistry';

describe('tooltipRegistry', () => {
  test('getMetricTooltip returns registry entry', () => {
    expect(getMetricTooltip('grossMargin')?.fullName).toBe('Gross Margin');
    expect(getMetricTooltip('grossMargin')?.tooltip).toMatch(/XBRL/i);
  });

  test('resolves aliases', () => {
    expect(getMetricTooltip('intensityScore')).toEqual(getMetricTooltip('intensityScore90d'));
    expect(getMetricTooltip('revenueYoY')).toEqual(getMetricTooltip('yoy'));
  });

  test('includes ebitdaEv entry for overview metrics', () => {
    expect(getMetricTooltip('ebitdaEv')?.fullName).toBe('EBITDA / Enterprise Value');
    expect(getMetricTooltip('ebitdaEv')?.formula).toMatch(/EBITDA/);
  });

  test('getMetricTooltipMeta shapes ColumnHeader metadata', () => {
    const meta = getMetricTooltipMeta('altmanZ', 'Z');
    expect(meta.fullName).toBe('Altman Z-Score');
    expect(meta.tooltip).toMatch(/1\.8/);
    expect(meta.formula).toBeTruthy();
  });

  test('formatMetricCellTooltip joins metric copy and heat line', () => {
    const text = formatMetricCellTooltip('pe', 'valuation · deep value · strong (tier 4/5)');
    expect(text).toMatch(/^Price relative to trailing earnings/);
    expect(text).toContain('valuation · deep value · strong');
  });

  test('priority metrics stay concise', () => {
    Object.keys(TOOLTIP_REGISTRY).forEach((key) => {
      const entry = TOOLTIP_REGISTRY[key];
      expect(entry.tooltip.length).toBeLessThanOrEqual(220);
    });
  });
});
