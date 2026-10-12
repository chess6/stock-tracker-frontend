import MetricFormulaDisplay from './MetricFormulaDisplay';

/**
 * Horizontal fraction bar for metric cell tooltips (numerator / denominator = result).
 */
export default function MetricFormulaFraction({ numerator, denominator, result }) {
  if (!numerator || !denominator) return null;
  return (
    <MetricFormulaDisplay
      spec={{
        type: 'ratio',
        num: { type: 'label', text: numerator },
        den: { type: 'label', text: denominator },
      }}
      result={result}
    />
  );
}
